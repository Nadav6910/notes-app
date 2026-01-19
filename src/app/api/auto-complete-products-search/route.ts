// app/api/auto-complete-products-search/route.ts
import { NextResponse } from 'next/server'
import puppeteer, { Browser, Page } from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import fs from 'node:fs'
import path from 'node:path'
import { SCRAPER_CONFIG, SCRAPER_URLS, validateScraperUrl } from '@/lib/scraper-config'
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30 // Vercel timeout

type RequestBody = {
  itemName: string
  maxResults?: number
  locationName?: string
  keepAliveMs?: number
}

export type AutocompleteSuggestion = {
  primary: string
  extra: string | null
  img: string | null
  href: string | null
  barcode: string | null
  priceRange: string | null
}

const { HOME, ADDRESS_SEL, PRODUCT_SEL } = SCRAPER_URLS

// Validate scraper URL at startup (defense-in-depth against SSRF)
validateScraperUrl(HOME)

// Cache implementation with better structure
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

// ---------- resolve a Chrome/Chromium executable path cross-platform ----------
function exists(p: string) {
  try { return fs.existsSync(p) } catch { return false }
}

// Prefer Sparticuz chromium ONLY on Linux (e.g. Vercel). Use local Chrome on mac/win.
async function resolveExecutablePath(): Promise<string> {
  const exists = (p: string) => { try { return fs.existsSync(p) } catch { return false } }

  if (process.platform === 'linux') {
    // Serverless / Vercel path
    const execPath = await chromium.executablePath()
    if (execPath && exists(execPath)) return execPath

    // (Very rare) fallback Linux paths if the above is empty
    const fallback = ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(exists)
    if (fallback) return fallback

    throw new Error('No Chromium executable on Linux')
  }

  // Local dev (macOS / Windows): use installed Chrome
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

// ---------- shared browser + warm page with keep-alive ----------
let browser: Browser | null = null
let warmPage: Page | null = null
let browserTimer: ReturnType<typeof setTimeout> | null = null
let pageTimer: ReturnType<typeof setTimeout> | null = null
let lock: Promise<void> | null = null
let release: (() => void) | null = null
let activeRequests = 0

async function getBrowser(): Promise<Browser> {
  if (browser) return browser

  const executablePath = await resolveExecutablePath()
  const isLinux = process.platform === 'linux'

  browser = await puppeteer.launch({
    executablePath,
    headless: true,                    // works for both dev & prod
    args: isLinux
      ? [
          ...chromium.args,            // tuned for serverless
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--single-process',          // small memory lambda tip
        ]
      : [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
    // DO NOT set chromium.defaultViewport/headless props directly (not part of the API)
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
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  )
  await page.setExtraHTTPHeaders({ 'accept-language': 'he-IL,he;q=0.9,en;q=0.8' })
  await page.setViewport({ width: 1280, height: 900 })

  await page.setRequestInterception(true)
  const blockedHosts = [
    'facebook.com', 'staticxx.facebook.com', 'connect.facebook.net',
    'google-analytics.com', 'googletagmanager.com', 'g.doubleclick.net',
    'hotjar.com', 'fullstory.com',
  ]
  page.on('request', req => {
    const t = req.resourceType()
    const url = req.url()
    if (t === 'image' || t === 'font' || t === 'media') return req.abort()
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
      if (!warmPage.url().startsWith(HOME)) {
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
      menus.forEach(ul => {
        ul.innerHTML = ''
        ul.style.display = 'none'
        ul.removeAttribute('data-stamp')
      })
    })
  } catch {}
  
  // Only start keep-alive timer if no active requests
  if (activeRequests === 0) {
    keepAlive(keepAliveMs)
  }
  
  if (release) release()
  lock = null
}

// ---------- UI helpers ----------
async function ensureJQueryUI(page: Page) {
  await page.waitForFunction(() => {
    const $ = (window as any).jQuery
    return !!$ && !!$.fn && typeof $.fn.autocomplete === 'function'
  })

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
    if (!id) {
      id = `auto-${Math.random().toString(36).slice(2)}`
      widget.attr('id', id)
    }
    widget.empty()
    widget.removeAttr('data-stamp')

    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    
    const once = () =>
      new Promise<{ id: string, stamp: string, hasResults: boolean }>((resolve, reject) => {
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

async function clickFirstByListId(page: Page, listId: string) {
  await page.evaluate((id: string) => {
    const ul = document.getElementById(id)
    if (!ul) return
    const li = ul.querySelector('li.ui-menu-item') as HTMLLIElement | null
    const target = (li?.querySelector('a') as HTMLElement) || (li as unknown as HTMLElement)
    target?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    target?.click()
  }, listId)
}

// ---------- scraping logic ----------
function buildScrapeFn() {
  return (listId: string, limit: number) => {
    // Optimized string cleaning
    const compact = (s: string | null | undefined) => {
      if (!s) return ''
      return s
        .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, '') // bidi marks
        .normalize('NFC')
        .replace(/\s+/g, ' ')
        .trim()
    }

    const ul = document.getElementById(listId) as HTMLElement | null
    if (!ul) return []

    const lis = Array.from(ul.querySelectorAll('li.ui-menu-item'))
      .filter(li => !/הצג\s+ערכים\s+נוספים/.test(li.textContent || ''))
      .slice(0, limit)

    const results = lis.map(li => {
      let primary = ''
      const firstSpan = li.querySelector('span')
      if (firstSpan) {
        const r = document.createRange()
        r.setStart(li, 0)
        r.setEndBefore(firstSpan)
        primary = compact(r.toString())
      } else {
        primary = compact(li.textContent || '')
      }

      const spans = Array.from(li.querySelectorAll('span'))
      let extra: string | null = null
      if (spans[0]?.textContent) {
        const raw = compact(spans[0].textContent.replace(/[()]/g, ' '))
        const firstChunk = raw.split(',')[0] || ''
        const brand = firstChunk.replace(/^[^:]*:\s*/, '').trim()
        extra = brand || null
      }

      const imgEl = li.querySelector('img')
      const img = imgEl ? imgEl.getAttribute('src') : null

      const a = li.querySelector('a') as HTMLAnchorElement | null
      const href = a?.getAttribute('href') ?? null

      const liText = compact(li.textContent || '')
      const bc = liText.match(/\b(\d{7,14})\b/)
      const barcode = bc ? bc[1] : null

      let priceRange: string | null = null
      const priceLabel = spans.find(s => /טווח\s*מחירים/.test(s.textContent || ''))
      if (priceLabel) {
        let n: ChildNode | null = priceLabel.nextSibling
        while (n) {
          if (n.nodeType === Node.TEXT_NODE) {
            const t = compact(n.textContent || '').replace(/^[:,\s]+/, '')
            if (t) { priceRange = t; break }
          } else if (n.nodeType === Node.ELEMENT_NODE) {
            const t = compact((n as HTMLElement).textContent || '').replace(/^[:,\s]+/, '')
            if (t) { priceRange = t; break }
          }
          n = n.nextSibling
        }
        if (!priceRange) {
          const r2 = document.createRange()
          r2.setStartAfter(priceLabel)
          r2.setEnd(li, li.childNodes.length)
          const tail = compact(r2.toString()).replace(/^[:,\s]+/, '')
          if (tail) priceRange = tail
        }
      }
      if (!priceRange) {
        const m = liText.match(/(\d{1,3}(?:[.,]\d{1,2})?)\s*[-–]\s*(\d{1,3}(?:[.,]\d{1,2})?)(?:\s*(?:ש.?ח|₪))?/)
        if (m) priceRange = compact(m[0])
      }

      return { primary, extra, img, href, barcode, priceRange }
    })

    return results
  }
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

// ---------- timeout utility ----------
function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(errorMsg)), ms)
    promise
      .then(val => { clearTimeout(timer); resolve(val) })
      .catch(err => { clearTimeout(timer); reject(err) })
  })
}

// ---------- Optimized search with fast path ----------
async function quickProductSearch(page: Page, itemName: string, maxResults: number): Promise<AutocompleteSuggestion[]> {
  // Fast path: directly search product without address setup
  const productResult = await withTimeout(
    openWidgetAndGetListId(page, PRODUCT_SEL, itemName.trim(), SCRAPER_CONFIG.FAST_PRODUCT_TIMEOUT_MS),
    SCRAPER_CONFIG.FAST_PRODUCT_TIMEOUT_MS + 500,
    'Quick product search timed out'
  )
  return await page.evaluate(buildScrapeFn(), productResult.listId, maxResults)
}

async function setupAddressIfNeeded(page: Page, locationName: string): Promise<{ actualCity: string, usedFallback: boolean }> {
  // Check if we already have a cached resolved city
  const cachedCity = getCachedCity(locationName)
  const cityToUse = cachedCity || locationName

  // Check if page is already initialized with this city
  if (lastInitializedCity === cityToUse) {
    return { actualCity: cityToUse, usedFallback: cachedCity !== null && cachedCity !== locationName }
  }

  let actualCity = cityToUse
  let usedFallback = false

  // Try the city (or cached resolved city)
  let addrResult = await withTimeout(
    openWidgetAndGetListId(page, ADDRESS_SEL, actualCity, SCRAPER_CONFIG.FAST_ADDRESS_TIMEOUT_MS),
    SCRAPER_CONFIG.FAST_ADDRESS_TIMEOUT_MS + 500,
    'Address lookup timed out'
  )

  // If no results and no cache, try fallback
  if (!addrResult.hasResults && !cachedCity) {
    const fallbackCity = findCityInMap(locationName, CITY_FALLBACK) || SCRAPER_CONFIG.DEFAULT_CITY
    console.log(`[auto-complete] City "${locationName}" not found, using "${fallbackCity}"`)

    addrResult = await withTimeout(
      openWidgetAndGetListId(page, ADDRESS_SEL, fallbackCity, SCRAPER_CONFIG.FAST_ADDRESS_TIMEOUT_MS),
      SCRAPER_CONFIG.FAST_ADDRESS_TIMEOUT_MS + 500,
      'Fallback address lookup timed out'
    )
    actualCity = fallbackCity
    usedFallback = true
  }

  if (addrResult.hasResults) {
    await clickFirstByListId(page, addrResult.listId)
    // Quick wait for address to register (reduced from 5s)
    await page.waitForFunction(() => {
      const city = document.querySelector<HTMLInputElement>('#shopping_address_city_id')
      return !!(city && city.value && city.value !== '0')
    }, { timeout: 2000 }).catch(() => {}) // Ignore timeout, proceed anyway

    // Cache the successful resolution
    setCachedCity(locationName, actualCity)
    lastInitializedCity = actualCity
  }

  return { actualCity, usedFallback }
}

// ---------- route ----------
export async function POST(req: Request) {
  // Rate limiting
  const clientIp = getClientIp(req)
  const rateLimitResult = checkRateLimit(clientIp, RATE_LIMITS.scraper)
  const rateLimitError = rateLimitResponse(rateLimitResult)
  if (rateLimitError) {
    return rateLimitError
  }

  const startTime = Date.now()

  const {
    itemName,
    maxResults = SCRAPER_CONFIG.AUTOCOMPLETE_MAX_RESULTS,
    locationName = SCRAPER_CONFIG.DEFAULT_CITY,
    keepAliveMs = SCRAPER_CONFIG.BROWSER_KEEP_ALIVE_MS
  } = await req.json() as RequestBody

  if (!itemName || itemName.trim().length < 2) {
    return NextResponse.json({ ok: false, error: 'itemName too short', errorCode: 'INVALID_INPUT' }, { status: 400 })
  }

  // Check cache first (location-independent for autocomplete)
  const cacheKey = `autocomplete:${itemName.trim().toLowerCase()}`
  const cached = getCached(cacheKey)
  if (cached) {
    return NextResponse.json({ ...cached, fromCache: true }, { status: 200 })
  }

  let page: Page | null = null
  let retryCount = 0

  const executeSearch = async (): Promise<NextResponse> => {
    try {
      page = await withTimeout(
        acquirePage(),
        8_000,  // Reduced from 10s
        'Browser initialization timed out'
      )

      await withTimeout(
        ensureJQueryUI(page),
        3_000,  // Reduced from 5s
        'Page initialization timed out'
      )

      // OPTIMIZATION: Try fast path first - direct product search without address
      // This works because autocomplete doesn't strictly need location
      let suggestions: AutocompleteSuggestion[] = []
      let usedFallbackCity = false
      let actualCity = locationName

      try {
        // Fast path: Try direct product search (skip address entirely)
        suggestions = await quickProductSearch(page, itemName, maxResults)

        // If we got results, we're done!
        if (suggestions.length > 0) {
          await releasePage(keepAliveMs)

          const duration = Date.now() - startTime
          const result = {
            ok: true,
            count: suggestions.length,
            suggestions,
            duration,
            fastPath: true
          }
          setCache(cacheKey, result)

          return NextResponse.json(result, { status: 200 })
        }
      } catch (fastErr) {
        // Fast path failed, continue to full flow
        console.log('[auto-complete] Fast path failed, trying full flow')
      }

      // Full flow: Set up address first, then search
      const addressResult = await setupAddressIfNeeded(page, locationName)
      actualCity = addressResult.actualCity
      usedFallbackCity = addressResult.usedFallback

      // Now search for product
      const productResult = await withTimeout(
        openWidgetAndGetListId(page, PRODUCT_SEL, itemName.trim(), 6_000),
        7_000,
        'Product search timed out'
      )
      suggestions = await page.evaluate(buildScrapeFn(), productResult.listId, maxResults)

      await releasePage(keepAliveMs)

      const duration = Date.now() - startTime
      const result = {
        ok: true,
        count: suggestions.length,
        suggestions,
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
        console.log(`[auto-complete-products-search] Retry ${retryCount}/${SCRAPER_CONFIG.MAX_RETRIES}`)

        // Force cleanup before retry
        try { await warmPage?.close() } catch {}
        warmPage = null
        lastInitializedCity = null

        if (release) release()
        lock = null

        await new Promise(r => setTimeout(r, SCRAPER_CONFIG.RETRY_DELAY_MS))
        return executeSearch()
      }

      throw err
    }
  }

  try {
    return await withTimeout(
      executeSearch(),
      SCRAPER_CONFIG.AUTOCOMPLETE_TIMEOUT_MS,
      'Request timed out'
    )
  } catch (err: any) {
    activeRequests = Math.max(0, activeRequests - 1)
    console.error('[auto-complete-products-search] Error:', err?.message || err)

    // Categorize errors for better user feedback
    const isTimeout = err?.message?.includes('timeout') || err?.name === 'TimeoutError'
    const isNetwork = err?.message?.includes('net::') || err?.code === 'ENOTFOUND'
    const isDisconnected = err?.message?.includes('disconnected')

    let errorCode = 'UNKNOWN_ERROR'
    let message = 'Failed to fetch suggestions. Please try again.'

    if (isTimeout) {
      errorCode = 'TIMEOUT'
      message = 'Search timed out. Please try again.'
    } else if (isNetwork) {
      errorCode = 'NETWORK_ERROR'
      message = 'Network error. Please check your connection.'
    } else if (isDisconnected) {
      errorCode = 'BROWSER_DISCONNECTED'
      message = 'Connection lost. Please try again.'
    }

    // Force cleanup on error
    try { await warmPage?.close() } catch {}
    warmPage = null
    lastInitializedCity = null

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