// app/api/get-product-prices/route.ts
import { NextResponse } from 'next/server'
import puppeteer, { Browser, Page } from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import fs from 'node:fs'
import path from 'node:path'
import { SCRAPER_CONFIG, SCRAPER_URLS } from '@/lib/scraper-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 45 // Vercel timeout

type RequestBody = {
  productName: string
  barcode?: string                // ← now optional
  locationName?: string
  maxRows?: number
  keepAliveMs?: number
}

type StorePriceRow = {
  chain: string
  branch: string
  address: string | null
  salePrice: string | null
  saleTitle: string | null
  saleDesc: string | null
  price: string | null
}

type ProductMetadata = {
  productImage: string | null
  productName: string | null
  priceGapPercent: number | null
  locationText: string | null
}

const { HOME, ADDRESS_SEL, PRODUCT_SEL, SUBMIT_BTN, RESULTS_SEL } = SCRAPER_URLS

// Cache implementation with better LRU
const cache = new Map<string, { data: any, expiry: number, timestamp: number }>()

function getCached(key: string) {
  const entry = cache.get(key)
  if (entry && Date.now() < entry.expiry) return entry.data
  cache.delete(key)
  return null
}

function setCache(key: string, data: any, ttlMs = SCRAPER_CONFIG.CACHE_TTL_MS) {
  // Implement simple LRU: if cache is full, delete oldest
  if (cache.size >= SCRAPER_CONFIG.CACHE_MAX_ENTRIES) {
    let oldestKey: string | null = null
    let oldestTime = Infinity
    for (const [k, v] of cache.entries()) {
      if (v.timestamp < oldestTime) {
        oldestTime = v.timestamp
        oldestKey = k
      }
    }
    if (oldestKey) cache.delete(oldestKey)
  }
  cache.set(key, { data, expiry: Date.now() + ttlMs, timestamp: Date.now() })
}

// ---------- timeout utility ----------
function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(errorMsg)), ms)
    promise
      .then(val => { clearTimeout(timer); resolve(val) })
      .catch(err => { clearTimeout(timer); reject(err) })
  })
}

// City name normalization - handle spelling variations
function normalizeCityName(city: string): string {
  return city
    .trim()
    .toLowerCase()
    // Common spelling variations
    .replace(/קרי[יה]ת/g, 'קריית')  // קרית or קריה -> קריית
    .replace(/קרי[יה]/g, 'קרי')      // קרי or קריה -> קרי
    .replace(/בא[ה]?ר/g, 'באר')    // באר or באהר -> באר
    .replace(/יפו/g, 'יפו')          // normalize יפו
    .replace(/תל[\s-]אביב/g, 'תל אביב')  // normalize Tel Aviv spacing
    // Normalize dashes and spaces
    .replace(/[\s-]+/g, ' ')
    .trim()
}

// Generate alternate spellings for a city name
function generateAlternateSpellings(city: string): string[] {
  const alternates: string[] = [city]
  const trimmed = city.trim()
  
  // קריית <-> קרית variations
  if (trimmed.includes('קריית')) {
    alternates.push(trimmed.replace(/קריית/g, 'קרית'))
    alternates.push(trimmed.replace(/קריית/g, 'קריית'))
  } else if (trimmed.includes('קרית')) {
    alternates.push(trimmed.replace(/קרית/g, 'קריית'))
    alternates.push(trimmed.replace(/קרית/g, 'קריית'))
  }
  
  // ה ending variations
  if (trimmed.endsWith('ה')) {
    alternates.push(trimmed.slice(0, -1) + 'א')
  } else if (trimmed.endsWith('א')) {
    alternates.push(trimmed.slice(0, -1) + 'ה')
  }
  
  return [...new Set(alternates)] // Remove duplicates
}

// Normalized city lookup - try exact match first, then normalized match
function findCityInMap<T>(city: string, map: Record<string, T>): T | undefined {
  // Try exact match
  if (map[city]) return map[city]
  
  // Try normalized match
  const normalized = normalizeCityName(city)
  const mapEntries = Object.entries(map)
  
  for (const [key, value] of mapEntries) {
    if (normalizeCityName(key) === normalized) {
      return value
    }
  }
  
  return undefined
}

// Major cities fallback map - when a small city isn't found, use nearest major city
const CITY_FALLBACK: Record<string, string> = {
  'קריית ים': 'חיפה',
  'קרית ים': 'חיפה',  // spelling variation
  'קריית אתא': 'חיפה',
  'קרית אתא': 'חיפה',  // spelling variation
  'קריית ביאליק': 'חיפה',
  'קרית ביאליק': 'חיפה',  // spelling variation
  'קריית מוצקין': 'חיפה',
  'קרית מוצקין': 'חיפה',  // spelling variation
  'טירת כרמל': 'חיפה',
  'נשר': 'חיפה',
  'כרמיאל': 'חיפה',
  'עכו': 'חיפה',
  'נהריה': 'חיפה',
  'נהרייה': 'חיפה',  // spelling variation
  'קריית שמונה': 'חיפה',
  'קרית שמונה': 'חיפה',  // spelling variation
  'צפת': 'חיפה',
  'טבריה': 'חיפה',
  'טבריא': 'חיפה',  // spelling variation
  'עפולה': 'חיפה',
  'נצרת': 'חיפה',
  'מגדל העמק': 'חיפה',
  'רמת גן': 'תל אביב',
  'גבעתיים': 'תל אביב',
  'בני ברק': 'תל אביב',
  'חולון': 'תל אביב',
  'בת ים': 'תל אביב',
  'הרצליה': 'תל אביב',
  'הרצלייה': 'תל אביב',  // spelling variation
  'רעננה': 'תל אביב',
  'כפר סבא': 'תל אביב',
  'הוד השרון': 'תל אביב',
  'רמת השרון': 'תל אביב',
  'פתח תקווה': 'תל אביב',
  'פתח תקוה': 'תל אביב',  // spelling variation
  'ראש העין': 'תל אביב',
  'יהוד': 'תל אביב',
  'אור יהודה': 'תל אביב',
  'קריית אונו': 'תל אביב',
  'קרית אונו': 'תל אביב',  // spelling variation
  'ראשון לציון': 'תל אביב',
  'נס ציונה': 'תל אביב',
  'נס ציונא': 'תל אביב',  // spelling variation
  'רחובות': 'תל אביב',
  'לוד': 'תל אביב',
  'רמלה': 'תל אביב',
  'מודיעין': 'תל אביב',
  'מודיעין מכבים רעות': 'תל אביב',
  'אשדוד': 'באר שבע',
  'אשקלון': 'באר שבע',
  'קריית גת': 'באר שבע',
  'קרית גת': 'באר שבע',  // spelling variation
  'שדרות': 'באר שבע',
  'נתיבות': 'באר שבע',
  'אופקים': 'באר שבע',
  'דימונה': 'באר שבע',
  'דימונא': 'באר שבע',  // spelling variation
  'ערד': 'באר שבע',
  'אילת': 'באר שבע',
}

// ---------- resolve Chrome executable (dev vs prod) ----------
const exists = (p: string) => { try { return fs.existsSync(p) } catch { return false } }

async function resolveExecutablePath(): Promise<string> {
  if (process.platform === 'linux') {
    const execPath = await chromium.executablePath()
    if (execPath && exists(execPath)) return execPath
    const fallback = [
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser'
    ].find(exists)
    if (fallback) return fallback
    throw new Error('No Chromium executable on Linux')
  }

  if (process.platform === 'darwin') {
    const mac = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      path.join(process.env.HOME || '', 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
    ].find(exists)
    if (mac) return mac
  }

  if (process.platform === 'win32') {
    const win = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
    ].find(exists)
    if (win) return win
  }

  throw new Error('Could not find a Chrome/Chromium executable on this system')
}

// ---------- shared browser + warm page ----------
let browser: Browser | null = null
let warmPage: Page | null = null
let browserTimer: NodeJS.Timeout | null = null
let pageTimer: NodeJS.Timeout | null = null
let activeRequests = 0

let lock: Promise<void> | null = null
let release: (() => void) | null = null

async function getBrowser(): Promise<Browser> {
  if (browser) return browser

  const executablePath = await resolveExecutablePath()
  const isLinux = process.platform === 'linux'

  browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: isLinux
      ? [
          ...chromium.args,
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--single-process',
        ]
      : [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
  })

  browser.on('disconnected', () => { browser = null })
  return browser
}

function keepAlive(ms: number) {
  if (browserTimer) clearTimeout(browserTimer)
  if (pageTimer) clearTimeout(pageTimer)

  pageTimer = setTimeout(async () => {
    try { await warmPage?.close() } catch {}
    warmPage = null
  }, ms)

  browserTimer = setTimeout(async () => {
    try { await browser?.close() } catch {}
    browser = null
  }, ms + 5_000)
}

async function hardenPage(page: Page) {
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  )
  await page.setExtraHTTPHeaders({ 'accept-language': 'he-IL,he;q=0.9,en;q=0.8' })
  await page.setViewport({ width: 1280, height: 900 })

  await page.setRequestInterception(true)
  const blockedHosts = [
    'facebook.com', 'staticxx.facebook.com', 'connect.facebook.net',
    'google-analytics.com', 'googletagmanager.com', 'g.doubleclick.net',
    'hotjar.com', 'fullstory.com'
  ]
  page.on('request', req => {
    const t = req.resourceType()
    const url = req.url()
    // Allow images in results area for product images, block others
    if (t === 'media') return req.abort()
    // Block tracking/analytics
    if (blockedHosts.some(h => url.includes(h))) return req.abort()
    req.continue()
  })

  page.setDefaultNavigationTimeout(SCRAPER_CONFIG.PAGE_NAVIGATION_TIMEOUT)
  page.setDefaultTimeout(SCRAPER_CONFIG.PAGE_DEFAULT_TIMEOUT)
}

async function acquirePage(): Promise<Page> {
  activeRequests++
  if (lock) await lock
  lock = new Promise(res => { release = res })

  const b = await getBrowser()
  if (!warmPage || warmPage.isClosed()) {
    warmPage = await b.newPage()
    await hardenPage(warmPage)
    await warmPage.goto(HOME, { waitUntil: 'domcontentloaded' })
  } else {
    try {
      const url = warmPage.url()
      if (!url.startsWith(HOME)) {
        await warmPage.goto(HOME, { waitUntil: 'domcontentloaded' })
      }
    } catch {
      try { await warmPage.close() } catch {}
      warmPage = await b.newPage()
      await hardenPage(warmPage)
      await warmPage.goto(HOME, { waitUntil: 'domcontentloaded' })
    }
  }
  return warmPage
}

async function releasePage(keepAliveMs: number) {
  activeRequests--
  try {
    await warmPage?.evaluate(() => {
      const addr = document.querySelector<HTMLInputElement>('#shopping_address')
      const prod = document.querySelector<HTMLInputElement>('#product_name_or_barcode')
      if (addr) addr.value = ''
      if (prod) prod.value = ''
      const menus = document.querySelectorAll<HTMLElement>('ul.ui-autocomplete')
      menus.forEach(ul => { ul.style.display = 'none'; ul.innerHTML = '' })
      const results = document.querySelector<HTMLElement>('#compare_results')
      if (results) results.innerHTML = ''
    })
  } catch {}
  
  // Only start keep-alive timer if no active requests
  if (activeRequests === 0) {
    keepAlive(keepAliveMs)
  }
  
  if (release) release()
  lock = null
}

// ---------- jQuery UI helpers (with "stamp" to avoid stale results) ----------
async function ensureJQueryUI(page: Page) {
  await page.waitForFunction(() => {
    const $ = (window as any).jQuery
    return !!$ && !!$.fn && typeof $.fn.autocomplete === 'function'
  })

  // speed up autocomplete
  await page.evaluate((addrSel, prodSel) => {
    // @ts-ignore
    const $ = (window as any).jQuery
    ;[addrSel, prodSel].forEach(sel => {
      try {
        const el = $(sel)
        if (el.length && el.autocomplete) {
          el.autocomplete('option', 'delay', 0)
          el.autocomplete('option', 'minLength', 0)
        }
      } catch {}
    })
  }, ADDRESS_SEL, PRODUCT_SEL)
}

async function openWidgetAndGetListId(page: Page, selector: string, value: string, timeoutMs = 8000) {
  const data = await page.evaluate(async (sel: string, v: string, timeout: number) => {
    // @ts-ignore
    const $ = (window as any).jQuery
    const el = $(sel)
    if (!el.length || !el.autocomplete) return { id: null as string | null, stamp: null as string | null, hasResults: false }

    el.autocomplete('close')
    const widget = el.autocomplete('widget')
    if (!widget || !widget.length) return { id: null, stamp: null, hasResults: false }

    let id = widget.attr('id')
    if (!id) { id = `auto-${Math.random().toString(36).slice(2)}`; widget.attr('id', id) }
    widget.empty()
    widget.removeAttr('data-stamp')

    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const once = () => new Promise<{ id: string, stamp: string, hasResults: boolean }>((resolve) => {
      // Set a timeout in case autocomplete never responds
      const timer = setTimeout(() => {
        widget.attr('data-stamp', stamp)
        resolve({ id: id!, stamp, hasResults: false })
      }, timeout - 1000)
      
      el.one('autocompleteresponse', (_: any, ui: any) => {
        clearTimeout(timer)
        widget.attr('data-stamp', stamp)
        const hasResults = ui?.content?.length > 0
        resolve({ id: id!, stamp, hasResults })
      })
      el.val(v)
      el.autocomplete('search', v)
    })

    return await once()
  }, selector, value, timeoutMs)

  if (!data.id || !data.stamp) throw new Error(`no widget id for ${selector}`)

  await page.waitForFunction((id: string, stamp: string) => {
    const ul = document.getElementById(id)
    return !!ul && ul.getAttribute('data-stamp') === stamp
  }, {}, data.id, data.stamp)

  return { listId: data.id, hasResults: data.hasResults }
}

// ---------- selection helpers (barcode OR name OR fallback) ----------
async function selectProductByBarcodeOrName(page: Page, listId: string, desiredName: string, desiredBarcode?: string) {
  const clicked = await page.evaluate((id: string, name: string, bc?: string) => {
    const ul = document.getElementById(id)
    if (!ul) return false

    // Filter list items, drop the "view more" row
    const items = Array.from(ul.querySelectorAll('li.ui-menu-item'))
      .filter(li => !/הצג\s+ערכים\s+נוספים/.test(li.textContent || ''))

    const clickEl = (li: HTMLLIElement | null) => {
      if (!li) return false
      const target = (li.querySelector('a') as HTMLElement) || (li as unknown as HTMLElement)
      if (!target) return false
      target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      target.click()
      return true
    }

    const compact = (s: string | null | undefined) => (s || '').replace(/\s+/g, ' ').trim()
    const crop = (s: string) => s.split(/[,،‚，]/)[0].trim().toLowerCase()
    const norm = (s: string) =>
      crop(compact(s).replace(/[()"'״׳]/g, '').replace(/\s+/g, ' '))

    const desiredNorm = norm(name)

    // 1) Try barcode
    if (bc && /\d{7,14}/.test(bc)) {
      const byBC = items.find(li => new RegExp(`\\b${bc}\\b`).test(li.textContent || ''))
      if (byBC && clickEl(byBC as HTMLLIElement)) return true
    }

    // 2) Try strict name match against the "primary" (text before first <span>)
    const getPrimary = (li: Element) => {
      const firstSpan = li.querySelector('span')
      if (firstSpan) {
        const r = document.createRange()
        r.setStart(li, 0)
        r.setEndBefore(firstSpan)
        return compact(r.toString())
      }
      // fallback: remove img+span and read the rest
      const clone = li.cloneNode(true) as HTMLElement
      clone.querySelectorAll('img, span').forEach(el => el.remove())
      return compact(clone.textContent || '')
    }

    const withPrimary = items.map(li => ({ li, p: norm(getPrimary(li)) }))
    let match = withPrimary.find(x => x.p === desiredNorm)?.li as HTMLLIElement | undefined
    if (match && clickEl(match)) return true

    // 3) Soft match (contains)
    match = withPrimary.find(x => x.p.includes(desiredNorm) || desiredNorm.includes(x.p))?.li as HTMLLIElement | undefined
    if (match && clickEl(match)) return true

    // 4) Fallback: first item
    return clickEl(items[0] as HTMLLIElement | null)
  }, listId, desiredName, desiredBarcode)

  if (!clicked) throw new Error('failed to select product by barcode or name')
}

// ---------- scrape product metadata (image + price gap) ----------
function buildScrapeMetadataFn() {
  return () => {
    const resultsDiv = document.getElementById('compare_results')
    if (!resultsDiv) return { productImage: null, productName: null, priceGapPercent: null, locationText: null }

    // Get product image - look for img with class imageuri or in the results table
    let productImage: string | null = null
    const imgEl = resultsDiv.querySelector('img.imageuri') || resultsDiv.querySelector('table img')
    if (imgEl) {
      // Prefer src over data-uri for smaller payload
      const src = imgEl.getAttribute('src')
      if (src && !src.startsWith('data:')) {
        productImage = src
      } else {
        // If it's a data URI, check if there's a non-data src elsewhere
        const dataSrc = imgEl.getAttribute('data-src') || imgEl.getAttribute('data-uri')
        productImage = dataSrc || src
      }
    }

    // Get product name from hidden input or h3
    let productName: string | null = null
    const nameInput = resultsDiv.querySelector<HTMLInputElement>('#displayed_product_name_and_contents')
    if (nameInput?.value) {
      productName = nameInput.value.trim()
    } else {
      const h3 = resultsDiv.querySelector('h3')
      if (h3) {
        // Get text before the <a> tag
        const clone = h3.cloneNode(true) as HTMLElement
        clone.querySelectorAll('a').forEach(a => a.remove())
        productName = clone.textContent?.replace(/\s+/g, ' ').trim() || null
      }
    }

    // Get price gap percentage from h4
    let priceGapPercent: number | null = null
    let locationText: string | null = null
    const h4 = resultsDiv.querySelector('h4')
    if (h4) {
      const h4Text = h4.textContent || ''
      // Extract location (e.g., "מחירים בקרבת קרית ים")
      const locationMatch = h4Text.match(/מחירים בקרבת\s+([^(]+)/)
      if (locationMatch) {
        locationText = locationMatch[1].trim()
      }
      // Extract percentage (e.g., "306%")
      const percentMatch = h4Text.match(/(\d+(?:\.\d+)?)\s*%/)
      if (percentMatch) {
        priceGapPercent = parseFloat(percentMatch[1])
      }
    }

    return { productImage, productName, priceGapPercent, locationText }
  }
}

// ---------- scrape table (with normalization) ----------
function buildScrapeTableFn() {
  return (tableSel: string, limit: number) => {
    // Optimized string cleaning
    const stripBidi = (s: string) =>
      s.replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, '')

    const compact = (s: string | null | undefined) => {
      if (!s) return ''
      return stripBidi(s).normalize('NFC').replace(/\s+/g, ' ').trim()
    }

    const dropASCII = (s: string) => compact(s).replace(/[A-Za-z]/g, '').trim()

    const removeDigitsBesideHebrew = (s: string) => {
      let out = compact(s)
      out = out.replace(/(?<=\p{Script=Hebrew})\d+(?=\p{Script=Hebrew})/gu, '')
      out = out.replace(/(?<=\p{Script=Hebrew})\d+/gu, '')
      out = out.replace(/\d+(?=\p{Script=Hebrew})/gu, '')
      return out.replace(/\s{2,}/g, ' ').trim()
    }

    const cleanHebrewStrict = (s: string) =>
      dropASCII(s).replace(/\d+/g, '').trim()

    const cleanAddress = (s: string) => {
      let out = removeDigitsBesideHebrew(dropASCII(s)).replace(/\s*,\s*/g, ', ')
      const idx = out.indexOf(', ')
      if (idx >= 0) {
        const first = out.slice(0, idx).trim()
        const rest = out.slice(idx + 2).replace(/\d+/g, '').replace(/\s{2,}/g, ' ').trim()
        return rest ? `${first}, ${rest}` : first
      }
      return out
    }

    const extractSale = (btn: HTMLButtonElement | null) => {
      if (!btn) return { price: null as string | null, title: null as string | null, desc: null as string | null }
      const title = btn.getAttribute('data-discount-title') || btn.getAttribute('title') || null
      const descRaw = btn.getAttribute('data-discount-desc') || ''
      const desc = descRaw ? compact(descRaw.replace(/<br\s*\/?>/gi, ' ')) : null

      const txt = compact(btn.innerText || btn.textContent || '')
      const nums = (txt.match(/\d+(?:[.,]\d{1,2})/g) || [])
        .map(m => parseFloat(m.replace(',', '.')))
        .filter(n => Number.isFinite(n) && n > 0)

      const priceNum = nums.length ? Math.min(...nums) : NaN
      const price = Number.isFinite(priceNum) ? priceNum.toFixed(2) : null

      return { price, title, desc }
    }

    const extractPrice = (td: HTMLElement | null, saleStr: string | null): string | null => {
      if (!td) return null

      // prefer explicit sort hint if present
      const ds = td.getAttribute('data-sort') || ''
      const dsNum = ds.match(/\d+(?:[.,]\d{1,2})?/)
      if (dsNum) return dsNum[0].replace(',', '.')

      // visible text fallback
      const vis = compact((td as HTMLElement).innerText || '')
      const matches = Array.from(vis.matchAll(/\d{1,3}(?:[.,]\d{1,2})/g)).map(m => parseFloat(m[0].replace(',', '.')))
      const nums = matches.filter(n => Number.isFinite(n) && n > 0)
      
      // Validate we have numbers
      if (!nums.length) return null

      const sale = saleStr ? parseFloat(saleStr) : NaN
      if (Number.isFinite(sale)) {
        const geSale = nums.filter(n => n >= sale + 0.01)
        if (geSale.length) {
          const finalPrice = Math.min(...geSale)
          return Number.isFinite(finalPrice) ? finalPrice.toFixed(2) : null
        }
      }

      const lastPrice = nums[nums.length - 1]
      return Number.isFinite(lastPrice) ? lastPrice.toFixed(2) : null
    }

    const table = document.querySelector<HTMLTableElement>(tableSel)
    if (!table) return []

    const rowEls = Array.from(table.querySelectorAll('tbody > tr'))
      .filter(tr => !tr.classList.contains('display_when_narrow'))
      .slice(0, limit)

    return rowEls.map(tr => {
      const tds = tr.querySelectorAll('td')

      const chain = cleanHebrewStrict(tds[0]?.textContent || '')
      const branch = cleanHebrewStrict(tds[1]?.textContent || '')
      const address = cleanAddress(tds[2]?.textContent || '') || null

      const saleBtn = tr.querySelector<HTMLButtonElement>('td:nth-child(4) button.btn-discount')
      const { price: salePrice, title: saleTitle, desc: saleDesc } = extractSale(saleBtn)

      const price = extractPrice(tds[4] as HTMLElement | null, salePrice)

      return { chain, branch, address, salePrice, saleTitle, saleDesc, price }
    })
  }
}

// ---------- route ----------
export async function POST(req: Request) {
  const startTime = Date.now()
  
  const {
    productName,
    barcode,                               // optional
    locationName = SCRAPER_CONFIG.DEFAULT_CITY,
    maxRows = SCRAPER_CONFIG.PRICES_MAX_ROWS,
    keepAliveMs = SCRAPER_CONFIG.BROWSER_KEEP_ALIVE_MS
  } = await req.json() as RequestBody

  if (!productName || productName.trim().length < 2) {
    return NextResponse.json({ ok: false, error: 'productName is required', errorCode: 'INVALID_INPUT' }, { status: 400 })
  }

  // Check cache first
  const cacheKey = `prices:${productName.trim().toLowerCase()}:${barcode || ''}:${locationName}`
  const cached = getCached(cacheKey)
  if (cached) {
    return NextResponse.json({ ...cached, fromCache: true }, { status: 200 })
  }

  let page: Page | null = null
  let retryCount = 0
  
  let usedFallbackCity = false
  let actualCity = locationName

  const executePricesFetch = async (): Promise<any> => {
    try {
      page = await withTimeout(
        acquirePage(),
        10_000,
        'Browser initialization timed out'
      )
      
      await withTimeout(
        ensureJQueryUI(page),
        5_000,
        'Page initialization timed out'
      )

      // 1) Set location - with timeout and alternate spelling support
      let addrResult = await withTimeout(
        openWidgetAndGetListId(page, ADDRESS_SEL, actualCity),
        8_000,
        'Address lookup timed out'
      )
      
      // If no results, try alternate spellings of the same city
      if (!addrResult.hasResults) {
        const alternates = generateAlternateSpellings(actualCity)
        for (const altCity of alternates.slice(1)) { // Skip first (original)
          console.log(`[get-product-prices] Trying alternate spelling "${altCity}"`)
          try {
            addrResult = await withTimeout(
              openWidgetAndGetListId(page, ADDRESS_SEL, altCity),
              8_000,
              'Address lookup timed out (alternate)'
            )
            if (addrResult.hasResults) {
              actualCity = altCity
              console.log(`[get-product-prices] Found city with alternate spelling: "${altCity}"`)
              break
            }
          } catch {
            continue
          }
        }
      }
      
      // If still no results, try a fallback major city
      if (!addrResult.hasResults) {
        const fallbackCity = findCityInMap(actualCity, CITY_FALLBACK)
        if (fallbackCity) {
          console.log(`[get-product-prices] City "${actualCity}" not found, falling back to "${fallbackCity}"`)
          
          addrResult = await withTimeout(
            openWidgetAndGetListId(page, ADDRESS_SEL, fallbackCity),
            8_000,
            'Address lookup timed out (fallback)'
          )
          usedFallbackCity = true
          actualCity = fallbackCity
        }
      }
      
      // If still no results, use default city
      if (!addrResult.hasResults) {
        console.log(`[get-product-prices] All attempts failed, using default "${SCRAPER_CONFIG.DEFAULT_CITY}"`)
        addrResult = await withTimeout(
          openWidgetAndGetListId(page, ADDRESS_SEL, SCRAPER_CONFIG.DEFAULT_CITY),
          8_000,
          'Address lookup timed out (default)'
        )
        usedFallbackCity = true
        actualCity = SCRAPER_CONFIG.DEFAULT_CITY
      }
      
      await page.evaluate((id: string) => {
        const ul = document.getElementById(id)
        if (!ul) return
        const li = ul.querySelector('li.ui-menu-item') as HTMLLIElement | null
        const target = (li?.querySelector('a') as HTMLElement) || (li as unknown as HTMLElement)
        target?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
        target?.click()
      }, addrResult.listId)

      await withTimeout(
        page.waitForFunction(() => {
          const city = document.querySelector<HTMLInputElement>('#shopping_address_city_id')
          const street = document.querySelector<HTMLInputElement>('#shopping_address_street_id')
          return !!((city && city.value && city.value !== '0') || (street && street.value && street.value !== '0'))
        }),
        5_000,
        'Address selection timed out'
      )

      // 2) Open product autocomplete & select by barcode OR name - with timeout
      const productResult = await withTimeout(
        openWidgetAndGetListId(page, PRODUCT_SEL, productName.trim()),
        10_000,
        'Product search timed out'
      )
      
      await withTimeout(
        selectProductByBarcodeOrName(page, productResult.listId, productName.trim(), barcode),
        5_000,
        'Product selection timed out'
      )

      // 3) Render results - with timeout
      await page.click(SUBMIT_BTN)
      
      await withTimeout(
        page.waitForFunction((sel: string) => {
          const table = document.querySelector<HTMLTableElement>(sel)
          return !!table && table.querySelectorAll('tbody > tr').length > 0
        }, {}, RESULTS_SEL),
        15_000,
        'Results loading timed out'
      )

      // Scrape both the table rows and the metadata
      const [rows, metadata] = await Promise.all([
        page.evaluate(buildScrapeTableFn(), RESULTS_SEL, maxRows),
        page.evaluate(buildScrapeMetadataFn())
      ])

      await releasePage(keepAliveMs)

      const duration = Date.now() - startTime
      const result = { 
        ok: true, 
        count: rows.length, 
        rows,
        metadata,
        duration,
        usedFallbackCity,
        actualCity: usedFallbackCity ? actualCity : undefined
      }
      setCache(cacheKey, result)

      return NextResponse.json(result, { status: 200 })
    }
    catch (err: any) {
      // Retry logic for certain errors
      const isRetryable = err?.message?.includes('timeout') || 
                          err?.message?.includes('net::') ||
                          err?.message?.includes('disconnected')
      
      if (isRetryable && retryCount < SCRAPER_CONFIG.MAX_RETRIES) {
        retryCount++
        console.log(`[get-product-prices] Retry ${retryCount}/${SCRAPER_CONFIG.MAX_RETRIES}`)
        
        // Force cleanup before retry
        try { await warmPage?.close() } catch {}
        warmPage = null
        
        if (release) release()
        lock = null
        
        await new Promise(r => setTimeout(r, SCRAPER_CONFIG.RETRY_DELAY_MS))
        return executePricesFetch()
      }
      
      throw err
    }
  }

  try {
    return await withTimeout(
      executePricesFetch(),
      SCRAPER_CONFIG.PRICES_TIMEOUT_MS,
      'Request timed out'
    )
  } catch (err: any) {
    activeRequests = Math.max(0, activeRequests - 1)
    console.error('[get-product-prices] Error:', err?.message || err)
    
    // Categorize errors for better user feedback
    const isTimeout = err?.message?.includes('timeout') || err?.name === 'TimeoutError'
    const isNetwork = err?.message?.includes('net::') || err?.code === 'ENOTFOUND'
    const isDisconnected = err?.message?.includes('disconnected')
    const isNoResults = err?.message?.includes('failed to select')
    
    let errorCode = 'UNKNOWN_ERROR'
    let message = 'Failed to fetch prices. Please try again.'
    
    if (isTimeout) {
      errorCode = 'TIMEOUT'
      message = 'Price lookup timed out. The service may be slow - please try again.'
    } else if (isNetwork) {
      errorCode = 'NETWORK_ERROR'
      message = 'Network error. Please check your connection.'
    } else if (isDisconnected) {
      errorCode = 'BROWSER_DISCONNECTED'
      message = 'Connection lost. Please try again.'
    } else if (isNoResults) {
      errorCode = 'PRODUCT_NOT_FOUND'
      message = 'Product not found. Try a different search term.'
    }
    
    // Force cleanup on error
    try { await warmPage?.close() } catch {}
    warmPage = null
    
    try { await browser?.close() } catch {}
    browser = null
    
    if (release) release()
    lock = null
    
    return NextResponse.json({ 
      ok: false, 
      error: message, 
      errorCode,
      retries: retryCount,
      duration: Date.now() - startTime
    }, { status: 500 })
  }
}