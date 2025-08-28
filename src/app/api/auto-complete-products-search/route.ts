// app/api/auto-complete-products-search/route.ts
import { NextResponse } from 'next/server'
import puppeteer, { Browser, Page } from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import fs from 'node:fs'
import path from 'node:path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

const HOME = 'https://chp.co.il/'
const ADDRESS_SEL = '#shopping_address'
const PRODUCT_SEL = '#product_name_or_barcode'

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

  page.setDefaultNavigationTimeout(35_000)
  page.setDefaultTimeout(10_000)
}

async function acquirePage(): Promise<Page> {
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
  keepAlive(keepAliveMs)
  if (release) release()
  lock = null
}

// ---------- UI helpers ----------
async function ensureJQueryUI(page: Page) {
  await page.waitForFunction(() => {
    // @ts-ignore
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

async function openWidgetAndGetListId(page: Page, selector: string, value: string) {
  const data = await page.evaluate(async (sel: string, v: string) => {
    // @ts-ignore
    const $ = (window as any).jQuery
    const el = $(sel)
    if (!el.length || !el.autocomplete) return { id: null as string | null, stamp: null as string | null }

    el.autocomplete('close')
    const widget = el.autocomplete('widget')
    if (!widget || !widget.length) return { id: null, stamp: null }

    let id = widget.attr('id')
    if (!id) {
      id = `auto-${Math.random().toString(36).slice(2)}`
      widget.attr('id', id)
    }
    widget.empty()
    widget.removeAttr('data-stamp')

    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const once = () =>
      new Promise<{ id: string, stamp: string }>(resolve => {
        el.one('autocompleteresponse', () => {
          widget.attr('data-stamp', stamp)
          resolve({ id: id!, stamp })
        })
        el.val(v)
        el.autocomplete('search', v)
      })

    return await once()
  }, selector, value)

  if (!data.id || !data.stamp) throw new Error(`no widget id for ${selector}`)

  await page.waitForFunction((id: string, stamp: string) => {
    const ul = document.getElementById(id)
    return !!ul && ul.getAttribute('data-stamp') === stamp
  }, {}, data.id, data.stamp)

  return data.id
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
    const compact = (s: string | null | undefined) => (s || '').replace(/\s+/g, ' ').trim()

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

// ---------- route ----------
export async function POST(req: Request) {
  const { itemName, maxResults = 15, locationName = 'תל אביב', keepAliveMs = 30_000 } =
    await req.json() as RequestBody

  if (!itemName || itemName.trim().length < 2) {
    return NextResponse.json({ ok: false, error: 'itemName too short' }, { status: 400 })
  }

  let page: Page | null = null
  try {
    page = await acquirePage()
    await ensureJQueryUI(page)

    // 1) Address
    const addrListId = await openWidgetAndGetListId(page, ADDRESS_SEL, locationName)
    await clickFirstByListId(page, addrListId)
    await page.waitForFunction(() => {
      const city = document.querySelector<HTMLInputElement>('#shopping_address_city_id')
      const street = document.querySelector<HTMLInputElement>('#shopping_address_street_id')
      return !!((city && city.value && city.value !== '0') || (street && street.value && street.value !== '0'))
    })

    // 2) Product
    const productListId = await openWidgetAndGetListId(page, PRODUCT_SEL, itemName.trim())
    const suggestions = await page.evaluate(buildScrapeFn(), productListId, maxResults)

    await releasePage(keepAliveMs)
    return NextResponse.json({ ok: true, count: suggestions.length, suggestions }, { status: 200 })
  } 
  
  catch (err: any) {
    console.error('Error occurred while processing request:', err)
    try { await warmPage?.close() } catch {}
    warmPage = null
    if (release) release()
    lock = null
    keepAlive(30_000)
    return NextResponse.json({ ok: false, error: err?.message || 'Unknown error' }, { status: 500 })
  }
}