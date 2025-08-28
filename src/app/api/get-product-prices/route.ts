// app/api/get-product-prices/route.ts
import { NextResponse } from 'next/server'
import puppeteer, { Browser, Page } from 'puppeteer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RequestBody = {
  productName: string
  barcode: string
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

const HOME = 'https://chp.co.il/'
const ADDRESS_SEL = '#shopping_address'
const PRODUCT_SEL = '#product_name_or_barcode'
const SUBMIT_BTN = '#get_compare_results_button'
const RESULTS_SEL = '#results-table'

// ---------- shared browser + warm page ----------
let browser: Browser | null = null
let warmPage: Page | null = null
let browserTimer: NodeJS.Timeout | null = null
let pageTimer: NodeJS.Timeout | null = null

let lock: Promise<void> | null = null
let release: (() => void) | null = null

const launchArgs = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']

async function getBrowser(): Promise<Browser> {
  if (browser) return browser
  browser = await puppeteer.launch({ headless: true, args: launchArgs })
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
    // do NOT block fonts here (some digits are font-mapped)
    if (t === 'image' || t === 'media') return req.abort()
    if (blockedHosts.some(h => url.includes(h))) return req.abort()
    req.continue()
  })

  page.setDefaultNavigationTimeout(35_000)
  page.setDefaultTimeout(12_000)
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
  try {
    await warmPage?.evaluate(() => {
      const addr = document.querySelector<HTMLInputElement>('#shopping_address')
      const prod = document.querySelector<HTMLInputElement>('#product_name_or_barcode')
      if (addr) addr.value = ''
      if (prod) prod.value = ''
      const menus = document.querySelectorAll<HTMLElement>('ul.ui-autocomplete')
      menus.forEach(ul => ul.style.display = 'none')
      const results = document.querySelector<HTMLElement>('#compare_results')
      if (results) results.innerHTML = ''
    })
  } catch {}
  keepAlive(keepAliveMs)
  if (release) release()
  lock = null
}

// ---------- jQuery UI helpers ----------
async function ensureJQueryUI(page: Page) {
  await page.waitForFunction(() => {
    // @ts-ignore
    const $ = (window as any).jQuery
    return !!$ && !!$.fn && typeof $.fn.autocomplete === 'function'
  })
}

async function openWidgetAndGetListId(page: Page, selector: string, value: string) {
  const listId = await page.evaluate((sel: string, v: string) => {
    // @ts-ignore
    const $ = (window as any).jQuery
    const el = $(sel)
    if (!el.length || !el.autocomplete) return null

    el.val(v)
    el.autocomplete('search', v)

    const widget = el.autocomplete('widget')
    if (!widget || !widget.length) return null

    let id = widget.attr('id')
    if (!id) {
      id = `auto-${Math.random().toString(36).slice(2)}`
      widget.attr('id', id)
    }
    return id as string
  }, selector, value)

  if (!listId) throw new Error(`no widget id for ${selector}`)

  await page.waitForFunction((id: string) => {
    const ul = document.getElementById(id)
    return !!ul && ul.querySelectorAll('li.ui-menu-item').length > 0
  }, {}, listId)

  return listId
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

async function clickByBarcode(page: Page, listId: string, barcode: string) {
  const clicked = await page.evaluate((id: string, bc: string) => {
    const ul = document.getElementById(id)
    if (!ul) return false
    const items = Array.from(ul.querySelectorAll('li.ui-menu-item'))
    const match = items.find(li => new RegExp(`\\b${bc}\\b`).test(li.textContent || ''))
    const target = (match?.querySelector('a') as HTMLElement) || (match as unknown as HTMLElement)
    if (!target) return false
    target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    target.click()
    return true
  }, listId, barcode)
  if (!clicked) throw new Error('product with given barcode not found in suggestions')
}

// ---------- scrape table (with normalization) ----------
function buildScrapeTableFn() {
  return (tableSel: string, limit: number) => {
    const stripBidi = (s: string) =>
      s.replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, '')

    const compact = (s: string | null | undefined) =>
      stripBidi((s || '')).normalize('NFC').replace(/\s+/g, ' ').trim()

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

    // sale button → min number is usually the sale price
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

    // price cell → use visible text only, pick the last number there
    const extractPrice = (td: HTMLElement | null, saleStr: string | null): string | null => {
      if (!td) return null

      // prefer explicit sort hint if present
      const ds = td.getAttribute('data-sort') || ''
      const dsNum = ds.match(/\d+(?:[.,]\d{1,2})?/)
      if (dsNum) return dsNum[0].replace(',', '.')

      const vis = compact((td as HTMLElement).innerText || '')
      const matches = Array.from(vis.matchAll(/\d{1,3}(?:[.,]\d{1,2})/g)).map(m => parseFloat(m[0].replace(',', '.')))
      const nums = matches.filter(n => Number.isFinite(n) && n > 0)

      if (!nums.length) return null

      // if we know the sale price, try to choose a number >= sale (base price)
      const sale = saleStr ? parseFloat(saleStr) : NaN
      if (Number.isFinite(sale)) {
        const geSale = nums.filter(n => n >= sale + 0.01)
        if (geSale.length) return Math.min(...geSale).toFixed(2)
      }

      // fallback: last visible number in the cell (commonly the base price)
      return nums[nums.length - 1].toFixed(2)
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
  const {
    productName,
    barcode,
    locationName = 'תל אביב',
    maxRows = 200,
    keepAliveMs = 20_000
  } = await req.json() as RequestBody

  if (!productName || !barcode) {
    return NextResponse.json({ ok: false, error: 'productName and barcode are required' }, { status: 400 })
  }

  let page: Page | null = null
  try {
    page = await acquirePage()
    await ensureJQueryUI(page)

    // 1) Set location
    const addrListId = await openWidgetAndGetListId(page, ADDRESS_SEL, locationName)
    await clickFirstByListId(page, addrListId)
    await page.waitForFunction(() => {
      const city = document.querySelector<HTMLInputElement>('#shopping_address_city_id')
      const street = document.querySelector<HTMLInputElement>('#shopping_address_street_id')
      return !!((city && city.value && city.value !== '0') || (street && street.value && street.value !== '0'))
    })

    // 2) Pick the product by barcode
    const productListId = await openWidgetAndGetListId(page, PRODUCT_SEL, productName)
    await clickByBarcode(page, productListId, barcode)

    // 3) Render results
    await page.click(SUBMIT_BTN)
    await page.waitForFunction((sel: string) => {
      const table = document.querySelector<HTMLTableElement>(sel)
      return !!table && table.querySelectorAll('tbody > tr').length > 0
    }, {}, RESULTS_SEL)

    const rows = await page.evaluate(buildScrapeTableFn(), RESULTS_SEL, maxRows)

    await releasePage(keepAliveMs)

    return NextResponse.json({ ok: true, count: rows.length, rows }, { status: 200 })
  } 
  
  catch (err: any) {
    console.log(err)
    try { await warmPage?.close() } catch {}
    console.log(err);
    warmPage = null
    if (release) release()
    lock = null
    keepAlive(keepAliveMs || 20_000)
    return NextResponse.json({ ok: false, error: err?.message || 'Unknown error' }, { status: 500 })
  }
}