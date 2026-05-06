// app/api/get-product-prices/route.ts
import { NextResponse } from 'next/server'
import puppeteer, { Browser, Page } from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import fs from 'node:fs'
import path from 'node:path'
import {
  SCRAPER_CONFIG,
  SCRAPER_URLS,
  validateScraperUrl,
  BLOCKED_SCRAPER_HOSTS,
  BLOCKED_RESOURCE_TYPES,
} from '@/lib/scraper-config'
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'
import {
  ScraperError,
  ScraperTimeoutError,
  ProductNotFoundError,
  toScraperError,
  userMessageFor,
} from '@/lib/scraper-errors'
import { logScraperError, logScraperEvent, recordError, recordRequest } from '@/lib/scraper-logger'
import { buildCacheKey, getCachedPrices, setCachedPrices, type Staleness } from '@/lib/price-cache'

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

// Validate scraper URL at startup (defense-in-depth against SSRF)
validateScraperUrl(HOME)

// Per-IP in-flight queue: caps concurrent live scrapes per IP so impatient
// users stacking calls don't overwhelm the warm browser.
const inFlightByIp = new Map<string, number>()

// City cache - remember which cities work/fail to avoid repeated lookups
const cityCache = new Map<string, { resolved: string, expiry: number }>()
const CITY_CACHE_TTL = 30 * 60_000 // 30 minutes

function getCachedCity(city: string): string | null {
  const entry = cityCache.get(city.toLowerCase())
  if (entry && Date.now() < entry.expiry) return entry.resolved
  cityCache.delete(city.toLowerCase())
  return null
}

function setCachedCity(original: string, resolved: string) {
  cityCache.set(original.toLowerCase(), {
    resolved,
    expiry: Date.now() + CITY_CACHE_TTL
  })
}

// Track if page is already initialized with a city
let lastInitializedCity: string | null = null

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
  page.on('request', req => {
    const t = req.resourceType()
    const url = req.url()
    if (BLOCKED_RESOURCE_TYPES.has(t)) return req.abort()
    if (BLOCKED_SCRAPER_HOSTS.some(h => url.includes(h))) return req.abort()
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
  } catch (err) {
    logScraperEvent('warn', 'release-page', 'page reset failed', { errMsg: (err as any)?.message })
  }

  // Only start keep-alive timer if no active requests
  if (activeRequests === 0) {
    keepAlive(keepAliveMs)
  }

  if (release) release()
  lock = null
}

// ---------- jQuery UI helpers (with "stamp" to avoid stale results) ----------
async function ensureJQueryUI(page: Page) {
  // jQuery / jQuery UI may never load if a script blocked or the page is broken.
  // Cap the wait so we don't hang the whole request.
  await page.waitForFunction(() => {
    const $ = (window as any).jQuery
    return !!$ && !!$.fn && typeof $.fn.autocomplete === 'function'
  }, { timeout: SCRAPER_CONFIG.JQUERY_READY_TIMEOUT_MS })

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

// ---------- Optimized address setup with caching ----------
async function setupAddressOptimized(
  page: Page,
  locationName: string
): Promise<{ actualCity: string, usedFallback: boolean, listId: string }> {
  // Check if we have a cached resolved city
  const cachedCity = getCachedCity(locationName)
  const cityToUse = cachedCity || locationName

  // Check if page is already initialized with this city - skip address setup
  if (lastInitializedCity === cityToUse) {
    // Return a dummy listId since we don't need to click anything
    return { actualCity: cityToUse, usedFallback: cachedCity !== null && cachedCity !== locationName, listId: '' }
  }

  let actualCity = cityToUse
  let usedFallback = cachedCity !== null && cachedCity !== locationName

  // Try the city (or cached resolved city) with reduced timeout
  let addrResult = await withTimeout(
    openWidgetAndGetListId(page, ADDRESS_SEL, actualCity, SCRAPER_CONFIG.FAST_ADDRESS_TIMEOUT_MS),
    SCRAPER_CONFIG.FAST_ADDRESS_TIMEOUT_MS + 500,
    'Address lookup timed out'
  )

  // If no results and no cache, try alternate spellings first, then fallback
  if (!addrResult.hasResults && !cachedCity) {
    // Try alternate spellings (e.g., קריית ים -> קרית ים)
    const alternates = generateAlternateSpellings(locationName)
    for (const alt of alternates) {
      if (alt === locationName) continue // Skip the original we already tried

      logScraperEvent('info', 'address.alternate-spelling', `trying "${alt}"`, { from: locationName })
      try {
        addrResult = await withTimeout(
          openWidgetAndGetListId(page, ADDRESS_SEL, alt, SCRAPER_CONFIG.FAST_ADDRESS_TIMEOUT_MS),
          SCRAPER_CONFIG.FAST_ADDRESS_TIMEOUT_MS + 500,
          'Alternate address lookup timed out'
        )
      } catch (err) {
        logScraperEvent('warn', 'address.alternate-spelling-failed', (err as any)?.message ?? String(err), { tried: alt })
        addrResult = { listId: '', hasResults: false }
      }

      if (addrResult.hasResults) {
        actualCity = alt
        logScraperEvent('info', 'address.alternate-spelling-hit', `matched on "${alt}"`)
        break
      }
    }

    // If still no results, fall back to major city
    if (!addrResult.hasResults) {
      const fallbackCity = findCityInMap(locationName, CITY_FALLBACK) || SCRAPER_CONFIG.DEFAULT_CITY
      logScraperEvent('info', 'address.fallback', `using "${fallbackCity}"`, { from: locationName })

      addrResult = await withTimeout(
        openWidgetAndGetListId(page, ADDRESS_SEL, fallbackCity, SCRAPER_CONFIG.FAST_ADDRESS_TIMEOUT_MS),
        SCRAPER_CONFIG.FAST_ADDRESS_TIMEOUT_MS + 500,
        'Fallback address lookup timed out'
      )
      actualCity = fallbackCity
      usedFallback = true
    }
  }

  // Click to select the address
  if (addrResult.hasResults) {
    await page.evaluate((id: string) => {
      const ul = document.getElementById(id)
      if (!ul) return
      const li = ul.querySelector('li.ui-menu-item') as HTMLLIElement | null
      const target = (li?.querySelector('a') as HTMLElement) || (li as unknown as HTMLElement)
      target?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      target?.click()
    }, addrResult.listId)

    // Quick wait for address to register (reduced timeout)
    await page.waitForFunction(() => {
      const city = document.querySelector<HTMLInputElement>('#shopping_address_city_id')
      return !!(city && city.value && city.value !== '0')
    }, { timeout: 2500 }).catch(err => {
      logScraperEvent('debug', 'address.register-wait-timeout', (err as any)?.message ?? String(err))
    })

    // Cache the successful resolution
    setCachedCity(locationName, actualCity)
    lastInitializedCity = actualCity
  }

  return { actualCity, usedFallback, listId: addrResult.listId }
}

// ---------- progress event shape ----------
export type ScrapeProgressStep =
  | 'launching'
  | 'locating'
  | 'searching-product'
  | 'submitting'
  | 'extracting'
  | 'done'
  | 'error'
  | 'cache-hit'

export interface ScrapeProgressEvent {
  step: ScrapeProgressStep
  label: string
  progress: number
  durationMs: number
  partial?: { rows?: any[] }
  error?: { code: string; message: string }
  result?: any
}

const STEP_LABELS: Record<ScrapeProgressStep, string> = {
  launching: 'Opening chp.co.il',
  locating: 'Confirming your location',
  'searching-product': 'Searching product',
  submitting: 'Comparing stores',
  extracting: 'Extracting prices',
  done: 'Done',
  error: 'Error',
  'cache-hit': 'Using recent results',
}

// ---------- core scrape orchestration (streaming-aware) ----------
async function runScrape(
  args: { productName: string; barcode?: string; locationName: string; maxRows: number },
  emit: (e: ScrapeProgressEvent) => void,
  startTime: number,
): Promise<{ rows: any[]; metadata: any; usedFallbackCity: boolean; actualCity: string }> {
  let page: Page | null = null
  let retryCount = 0
  let usedFallbackCity = false
  let actualCity = args.locationName

  const send = (step: ScrapeProgressStep, progress: number, extra: Partial<ScrapeProgressEvent> = {}) => {
    emit({
      step,
      label: STEP_LABELS[step],
      progress,
      durationMs: Date.now() - startTime,
      ...extra,
    })
  }

  const attempt = async (): Promise<{ rows: any[]; metadata: any }> => {
    page = await withTimeout(acquirePage(), 8_000, 'Browser initialization timed out')
    send('launching', 0.1)

    await withTimeout(
      ensureJQueryUI(page),
      SCRAPER_CONFIG.JQUERY_READY_TIMEOUT_MS,
      'Page initialization timed out',
    )

    send('locating', 0.25)
    const addressResult = await setupAddressOptimized(page, args.locationName)
    actualCity = addressResult.actualCity
    usedFallbackCity = addressResult.usedFallback

    send('searching-product', 0.45)
    const productResult = await withTimeout(
      openWidgetAndGetListId(page, PRODUCT_SEL, args.productName.trim(), 6_000),
      7_000,
      'Product search timed out',
    )

    if (!productResult.hasResults) {
      throw new ProductNotFoundError(args.productName)
    }

    await withTimeout(
      selectProductByBarcodeOrName(page, productResult.listId, args.productName.trim(), args.barcode),
      3_000,
      'Product selection timed out',
    )

    send('submitting', 0.6)
    await page.click(SUBMIT_BTN)

    await withTimeout(
      page.waitForFunction(
        (sel: string) => {
          const table = document.querySelector<HTMLTableElement>(sel)
          return !!table && table.querySelectorAll('tbody > tr').length > 0
        },
        {},
        RESULTS_SEL,
      ),
      12_000,
      'Results loading timed out',
    )

    send('extracting', 0.85)
    const [rows, metadata] = await Promise.all([
      withTimeout(
        page.evaluate(buildScrapeTableFn(), RESULTS_SEL, args.maxRows),
        SCRAPER_CONFIG.EVALUATE_HARD_TIMEOUT_MS,
        'Table extraction timed out',
      ),
      withTimeout(
        page.evaluate(buildScrapeMetadataFn()),
        SCRAPER_CONFIG.EVALUATE_HARD_TIMEOUT_MS,
        'Metadata extraction timed out',
      ),
    ])

    return { rows, metadata }
  }

  // Retry loop with exponential backoff for retryable errors only.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const { rows, metadata } = await attempt()
      // adaptive keep-alive: extend after success
      await releasePage(SCRAPER_CONFIG.BROWSER_KEEP_ALIVE_AFTER_HIT_MS)
      return { rows, metadata, usedFallbackCity, actualCity }
    } catch (rawErr) {
      const sErr = toScraperError(rawErr)
      const canRetry = sErr.retryable && retryCount < SCRAPER_CONFIG.MAX_RETRIES
      logScraperEvent(canRetry ? 'warn' : 'error', 'scrape.attempt-failed', sErr.message, {
        code: sErr.code,
        attempt: retryCount + 1,
        canRetry,
      })

      if (!canRetry) throw sErr

      // restart browser only if it died; otherwise just reset the page
      if (sErr.code === 'BROWSER_DISCONNECTED') {
        try { await browser?.close() } catch {}
        browser = null
      }
      try { await warmPage?.close() } catch {}
      warmPage = null
      lastInitializedCity = null
      if (release) release()
      lock = null

      const delay = SCRAPER_CONFIG.RETRY_BASE_DELAY_MS *
        Math.pow(SCRAPER_CONFIG.RETRY_BACKOFF_FACTOR, retryCount)
      retryCount++
      await new Promise(r => setTimeout(r, delay))
    }
  }
}

function buildPricesResult(args: {
  rows: any[]
  metadata: any
  duration: number
  usedFallbackCity: boolean
  actualCity: string
  staleness: Staleness
  cacheCreatedAt?: Date
}) {
  return {
    ok: true,
    count: args.rows.length,
    rows: args.rows,
    metadata: args.metadata,
    duration: args.duration,
    usedFallbackCity: args.usedFallbackCity,
    actualCity: args.usedFallbackCity ? args.actualCity : undefined,
    staleness: args.staleness,
    cacheCreatedAt: args.cacheCreatedAt?.toISOString(),
  }
}

// ---------- route ----------
export async function POST(req: Request) {
  // Rate limiting
  const clientIp = getClientIp(req)
  const rateLimitResult = checkRateLimit(clientIp, RATE_LIMITS.scraper)
  const rateLimitError = rateLimitResponse(rateLimitResult)
  if (rateLimitError) return rateLimitError

  const url = new URL(req.url)
  const wantsStream = url.searchParams.get('stream') === '1'
  const force = url.searchParams.get('force') === '1'

  const startTime = Date.now()

  const body = (await req.json()) as RequestBody
  const productName = body.productName
  const barcode = body.barcode
  const locationName = body.locationName ?? SCRAPER_CONFIG.DEFAULT_CITY
  const maxRows = body.maxRows ?? SCRAPER_CONFIG.PRICES_MAX_ROWS

  if (!productName || productName.trim().length < 2) {
    return NextResponse.json(
      { ok: false, error: 'productName is required', errorCode: 'INVALID_INPUT' },
      { status: 400 },
    )
  }

  const cacheKey = buildCacheKey(productName, barcode, locationName)

  // Cache check (skipped if `?force=1`). On a hit, reply instantly with the
  // single-shot JSON shape, regardless of `?stream=1` — there's nothing to
  // stream when we already have the answer.
  if (!force) {
    const cached = await getCachedPrices<{ rows: any[]; metadata: any; usedFallbackCity: boolean; actualCity: string }>(
      cacheKey,
    )
    if (cached) {
      const result = buildPricesResult({
        rows: cached.data.rows,
        metadata: cached.data.metadata,
        duration: Date.now() - startTime,
        usedFallbackCity: cached.data.usedFallbackCity,
        actualCity: cached.data.actualCity,
        staleness: cached.staleness,
        cacheCreatedAt: cached.createdAt,
      })
      return NextResponse.json({ ...result, fromCache: true }, { status: 200 })
    }
  }

  // Per-IP in-flight queue (lightweight)
  const ipDepth = inFlightByIp.get(clientIp) ?? 0
  if (ipDepth >= SCRAPER_CONFIG.PER_IP_QUEUE_DEPTH) {
    recordError('RATE_LIMITED')
    return NextResponse.json(
      { ok: false, error: userMessageFor('RATE_LIMITED'), errorCode: 'RATE_LIMITED' },
      { status: 429 },
    )
  }
  inFlightByIp.set(clientIp, ipDepth + 1)

  const cleanupOnError = async () => {
    activeRequests = Math.max(0, activeRequests - 1)
    try { await warmPage?.close() } catch {}
    warmPage = null
    lastInitializedCity = null
    if (release) release()
    lock = null
    inFlightByIp.set(clientIp, Math.max(0, (inFlightByIp.get(clientIp) ?? 1) - 1))
    if ((inFlightByIp.get(clientIp) ?? 0) === 0) inFlightByIp.delete(clientIp)
  }

  const decrementInFlight = () => {
    const left = (inFlightByIp.get(clientIp) ?? 1) - 1
    if (left <= 0) inFlightByIp.delete(clientIp)
    else inFlightByIp.set(clientIp, left)
  }

  // ---- streaming path ----
  if (wantsStream) {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const writeEvent = (e: ScrapeProgressEvent) => {
          try {
            controller.enqueue(encoder.encode(JSON.stringify(e) + '\n'))
          } catch (err) {
            logScraperEvent('warn', 'stream.enqueue-failed', (err as any)?.message ?? String(err))
          }
        }
        try {
          const { rows, metadata, usedFallbackCity: ufc, actualCity: ac } = await runScrape(
            { productName, barcode, locationName, maxRows },
            writeEvent,
            startTime,
          )
          const duration = Date.now() - startTime
          const result = buildPricesResult({
            rows, metadata, duration,
            usedFallbackCity: ufc, actualCity: ac, staleness: 'live',
          })
          setCachedPrices(cacheKey, { rows, metadata, usedFallbackCity: ufc, actualCity: ac })
            .catch(err => logScraperError('cache.set-fire-and-forget', err, { cacheKey }))
          recordRequest(duration)
          writeEvent({ step: 'done', label: STEP_LABELS.done, progress: 1, durationMs: duration, result })
          controller.close()
        } catch (rawErr) {
          const sErr = rawErr instanceof ScraperError ? rawErr : toScraperError(rawErr)
          const duration = Date.now() - startTime
          recordError(sErr.code)
          await cleanupOnError()
          writeEvent({
            step: 'error',
            label: STEP_LABELS.error,
            progress: 1,
            durationMs: duration,
            error: { code: sErr.code, message: userMessageFor(sErr.code) },
          })
          controller.close()
          return
        }
        decrementInFlight()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Accel-Buffering': 'no',
      },
    })
  }

  // ---- single-shot path (legacy) ----
  try {
    const { rows, metadata, usedFallbackCity: ufc, actualCity: ac } = await withTimeout(
      runScrape({ productName, barcode, locationName, maxRows }, () => {}, startTime),
      SCRAPER_CONFIG.PRICES_TIMEOUT_MS,
      'Request timed out',
    )
    const duration = Date.now() - startTime
    const result = buildPricesResult({
      rows, metadata, duration,
      usedFallbackCity: ufc, actualCity: ac, staleness: 'live',
    })
    setCachedPrices(cacheKey, { rows, metadata, usedFallbackCity: ufc, actualCity: ac })
      .catch(err => logScraperError('cache.set-fire-and-forget', err, { cacheKey }))
    recordRequest(duration)
    decrementInFlight()
    return NextResponse.json(result, { status: 200 })
  } catch (rawErr) {
    const sErr = rawErr instanceof ScraperError ? rawErr : toScraperError(rawErr)
    recordError(sErr.code)
    await cleanupOnError()
    return NextResponse.json(
      {
        ok: false,
        error: userMessageFor(sErr.code),
        errorCode: sErr.code,
        duration: Date.now() - startTime,
      },
      { status: sErr.code === 'PRODUCT_NOT_FOUND' ? 404 : 500 },
    )
  }
}