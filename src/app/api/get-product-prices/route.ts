// app/api/get-product-prices/route.ts
import { NextResponse } from 'next/server'
import { Page } from 'puppeteer-core'
import {
  browserPool,
  pricesCache,
  generateCacheKey,
  withRetry,
  withTimeout,
  scraperCircuitBreaker,
  CircuitBreakerError,
  deduplicatedRequest
} from '@/lib/scraper'
import { createErrorResponse, type PriceErrorResponse } from '@/lib/error-types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Operation timeout - max time for entire scraping operation
const OPERATION_TIMEOUT_MS = 25_000

type RequestBody = {
  productName: string
  barcode?: string
  locationName?: string
  maxRows?: number
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

type SuccessResponse = {
  ok: true
  count: number
  rows: StorePriceRow[]
  cached: boolean
  meta: {
    responseTimeMs: number
    circuitState: string
  }
}

const HOME = 'https://chp.co.il/'
const ADDRESS_SEL = '#shopping_address'
const PRODUCT_SEL = '#product_name_or_barcode'
const SUBMIT_BTN = '#get_compare_results_button'
const RESULTS_SEL = '#results-table'

// ---------- UI helpers ----------
async function ensureJQueryUI(page: Page) {
  await page.waitForFunction(() => {
    const $ = (window as any).jQuery
    return !!$ && !!$.fn && typeof $.fn.autocomplete === 'function'
  })

  await page.evaluate((addrSel, prodSel) => {
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
    return !!ul && ul.getAttribute('data-stamp') === stamp && ul.querySelectorAll('li.ui-menu-item').length > 0
  }, {}, data.id, data.stamp)

  return data.id
}

// ---------- selection helpers (barcode OR name OR fallback) ----------
async function selectProductByBarcodeOrName(page: Page, listId: string, desiredName: string, desiredBarcode?: string) {
  const clicked = await page.evaluate((id: string, name: string, bc?: string) => {
    const ul = document.getElementById(id)
    if (!ul) return false

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

    // 2) Try strict name match
    const getPrimary = (li: Element) => {
      const firstSpan = li.querySelector('span')
      if (firstSpan) {
        const r = document.createRange()
        r.setStart(li, 0)
        r.setEndBefore(firstSpan)
        return compact(r.toString())
      }
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

// ---------- Pre-compiled regex for text normalization ----------
const BIDI_REGEX = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g

// ---------- scrape table function ----------
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

      const ds = td.getAttribute('data-sort') || ''
      const dsNum = ds.match(/\d+(?:[.,]\d{1,2})?/)
      if (dsNum) return dsNum[0].replace(',', '.')

      const vis = compact((td as HTMLElement).innerText || '')
      const matches = Array.from(vis.matchAll(/\d{1,3}(?:[.,]\d{1,2})/g)).map(m => parseFloat(m[0].replace(',', '.')))
      const nums = matches.filter(n => Number.isFinite(n) && n > 0)
      if (!nums.length) return null

      const sale = saleStr ? parseFloat(saleStr) : NaN
      if (Number.isFinite(sale)) {
        const geSale = nums.filter(n => n >= sale + 0.01)
        if (geSale.length) return Math.min(...geSale).toFixed(2)
      }

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

// Core scraping operation
async function scrapePrices(
  productName: string,
  locationName: string,
  maxRows: number,
  barcode?: string
): Promise<StorePriceRow[]> {
  const { page, release } = await browserPool.acquirePage()

  try {
    // Navigate to home if needed
    const currentUrl = page.url()
    if (!currentUrl.startsWith(HOME)) {
      await page.goto(HOME, { waitUntil: 'domcontentloaded' })
    }

    await ensureJQueryUI(page)

    // 1) Set location
    const addrListId = await openWidgetAndGetListId(page, ADDRESS_SEL, locationName)
    await page.evaluate((id: string) => {
      const ul = document.getElementById(id)
      if (!ul) return
      const li = ul.querySelector('li.ui-menu-item') as HTMLLIElement | null
      const target = (li?.querySelector('a') as HTMLElement) || (li as unknown as HTMLElement)
      target?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      target?.click()
    }, addrListId)

    await page.waitForFunction(() => {
      const city = document.querySelector<HTMLInputElement>('#shopping_address_city_id')
      const street = document.querySelector<HTMLInputElement>('#shopping_address_street_id')
      return !!((city && city.value && city.value !== '0') || (street && street.value && street.value !== '0'))
    })

    // 2) Open product autocomplete & select by barcode OR name
    const productListId = await openWidgetAndGetListId(page, PRODUCT_SEL, productName.trim())
    await selectProductByBarcodeOrName(page, productListId, productName.trim(), barcode)

    // 3) Render results
    await page.click(SUBMIT_BTN)
    await page.waitForFunction((sel: string) => {
      const table = document.querySelector<HTMLTableElement>(sel)
      return !!table && table.querySelectorAll('tbody > tr').length > 0
    }, {}, RESULTS_SEL)

    const rows = await page.evaluate(buildScrapeTableFn(), RESULTS_SEL, maxRows)

    // Clear inputs for next use
    await page.evaluate(() => {
      const addr = document.querySelector<HTMLInputElement>('#shopping_address')
      const prod = document.querySelector<HTMLInputElement>('#product_name_or_barcode')
      if (addr) addr.value = ''
      if (prod) prod.value = ''
      const menus = document.querySelectorAll<HTMLElement>('ul.ui-autocomplete')
      menus.forEach(ul => { ul.style.display = 'none'; ul.innerHTML = '' })
      const results = document.querySelector<HTMLElement>('#compare_results')
      if (results) results.innerHTML = ''
    }).catch(() => {})

    return rows
  } finally {
    await release()
  }
}

// ---------- route ----------
export async function POST(req: Request): Promise<NextResponse<SuccessResponse | PriceErrorResponse>> {
  const startTime = Date.now()

  let body: RequestBody
  try {
    body = await req.json() as RequestBody
  } catch {
    return NextResponse.json(
      createErrorResponse('Invalid JSON in request body'),
      { status: 400 }
    )
  }

  const {
    productName,
    barcode,
    locationName = 'תל אביב',
    maxRows = 200
  } = body

  // Validation
  if (!productName || productName.trim().length < 2) {
    return NextResponse.json(
      createErrorResponse('productName is required'),
      { status: 400 }
    )
  }

  if (maxRows < 1 || maxRows > 1000) {
    return NextResponse.json(
      createErrorResponse('maxRows must be between 1 and 1000'),
      { status: 400 }
    )
  }

  // Check cache first
  const cacheKey = generateCacheKey({
    productName: productName.trim(),
    barcode: barcode || '',
    locationName,
    maxRows
  })
  const cached = pricesCache.get(cacheKey)

  if (cached) {
    return NextResponse.json({
      ok: true,
      count: cached.length,
      rows: cached,
      cached: true,
      meta: {
        responseTimeMs: Date.now() - startTime,
        circuitState: scraperCircuitBreaker.getState()
      }
    })
  }

  // Deduplicate identical in-flight requests
  const dedupKey = `prices:${cacheKey}`

  try {
    const rows = await deduplicatedRequest(dedupKey, async () => {
      // Use circuit breaker for fault tolerance
      return scraperCircuitBreaker.execute(async () => {
        // Wrap with retry and timeout
        return withRetry(
          () => withTimeout(
            () => scrapePrices(productName, locationName, maxRows, barcode),
            OPERATION_TIMEOUT_MS,
            'Price fetch operation timed out'
          ),
          { maxAttempts: 2 }
        )
      })
    })

    // Cache successful results
    pricesCache.set(cacheKey, rows)

    return NextResponse.json({
      ok: true,
      count: rows.length,
      rows,
      cached: false,
      meta: {
        responseTimeMs: Date.now() - startTime,
        circuitState: scraperCircuitBreaker.getState()
      }
    })
  } catch (err: any) {
    console.error('[get-product-prices] Error:', err?.message)

    // Handle circuit breaker errors specially
    if (err instanceof CircuitBreakerError) {
      return NextResponse.json(
        createErrorResponse(err.message, err.retryAfterMs),
        { status: 503 }
      )
    }

    return NextResponse.json(
      createErrorResponse(err?.message || 'Unknown error'),
      { status: 500 }
    )
  }
}
