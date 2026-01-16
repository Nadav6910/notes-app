// app/api/auto-complete-products-search/route.ts
import { NextResponse } from 'next/server'
import { Page } from 'puppeteer-core'
import {
  browserPool,
  autocompleteCache,
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
const OPERATION_TIMEOUT_MS = 20_000

type RequestBody = {
  itemName: string
  maxResults?: number
  locationName?: string
}

export type AutocompleteSuggestion = {
  primary: string
  extra: string | null
  img: string | null
  href: string | null
  barcode: string | null
  priceRange: string | null
}

type SuccessResponse = {
  ok: true
  count: number
  suggestions: AutocompleteSuggestion[]
  cached: boolean
  meta: {
    responseTimeMs: number
    circuitState: string
  }
}

const HOME = 'https://chp.co.il/'
const ADDRESS_SEL = '#shopping_address'
const PRODUCT_SEL = '#product_name_or_barcode'

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

// Core scraping operation
async function scrapeAutocomplete(
  itemName: string,
  locationName: string,
  maxResults: number
): Promise<AutocompleteSuggestion[]> {
  console.log('[scrapeAutocomplete] Acquiring page from browser pool...')

  let page, release
  try {
    const acquired = await browserPool.acquirePage()
    page = acquired.page
    release = acquired.release
    console.log('[scrapeAutocomplete] Page acquired successfully')
  } catch (acquireErr: any) {
    console.error('[scrapeAutocomplete] Failed to acquire page:', acquireErr?.message)
    throw acquireErr
  }

  try {
    // Navigate to home if needed
    const currentUrl = page.url()
    console.log('[scrapeAutocomplete] Current URL:', currentUrl)

    if (!currentUrl.startsWith(HOME)) {
      console.log('[scrapeAutocomplete] Navigating to', HOME)
      await page.goto(HOME, { waitUntil: 'domcontentloaded' })
      console.log('[scrapeAutocomplete] Navigation complete')
    }

    console.log('[scrapeAutocomplete] Ensuring jQuery UI...')
    await ensureJQueryUI(page)
    console.log('[scrapeAutocomplete] jQuery UI ready')

    // 1) Set address/location
    console.log('[scrapeAutocomplete] Setting location:', locationName)
    const addrListId = await openWidgetAndGetListId(page, ADDRESS_SEL, locationName)
    await clickFirstByListId(page, addrListId)
    await page.waitForFunction(() => {
      const city = document.querySelector<HTMLInputElement>('#shopping_address_city_id')
      const street = document.querySelector<HTMLInputElement>('#shopping_address_street_id')
      return !!((city && city.value && city.value !== '0') || (street && street.value && street.value !== '0'))
    })
    console.log('[scrapeAutocomplete] Location set')

    // 2) Search for product
    console.log('[scrapeAutocomplete] Searching for product:', itemName)
    const productListId = await openWidgetAndGetListId(page, PRODUCT_SEL, itemName.trim())
    const suggestions = await page.evaluate(buildScrapeFn(), productListId, maxResults)
    console.log('[scrapeAutocomplete] Got', suggestions.length, 'suggestions')

    // Clear inputs for next use
    await page.evaluate(() => {
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
    }).catch(() => {})

    return suggestions
  } catch (scrapeErr: any) {
    console.error('[scrapeAutocomplete] Scraping error:', scrapeErr?.message)
    throw scrapeErr
  } finally {
    console.log('[scrapeAutocomplete] Releasing page...')
    await release()
    console.log('[scrapeAutocomplete] Page released')
  }
}

// ---------- route ----------
export async function POST(req: Request): Promise<NextResponse<SuccessResponse | PriceErrorResponse>> {
  const startTime = Date.now()
  console.log('[auto-complete-products-search] Request received')

  let body: RequestBody
  try {
    body = await req.json() as RequestBody
  } catch (parseErr: any) {
    console.error('[auto-complete-products-search] JSON parse error:', parseErr?.message)
    return NextResponse.json(
      createErrorResponse('Invalid JSON in request body'),
      { status: 400 }
    )
  }

  const { itemName, maxResults = 15, locationName = 'תל אביב' } = body
  console.log('[auto-complete-products-search] Searching for:', itemName, 'in', locationName)

  // Validation
  if (!itemName || itemName.trim().length < 2) {
    console.log('[auto-complete-products-search] Validation failed: item name too short')
    return NextResponse.json(
      createErrorResponse('Item name must be at least 2 characters'),
      { status: 400 }
    )
  }

  if (maxResults < 1 || maxResults > 100) {
    console.log('[auto-complete-products-search] Validation failed: maxResults out of range')
    return NextResponse.json(
      createErrorResponse('maxResults must be between 1 and 100'),
      { status: 400 }
    )
  }

  // Check cache first
  const cacheKey = generateCacheKey({ itemName: itemName.trim(), locationName, maxResults })
  const cached = autocompleteCache.get(cacheKey)

  if (cached) {
    console.log('[auto-complete-products-search] Returning cached result:', cached.length, 'items')
    return NextResponse.json({
      ok: true,
      count: cached.length,
      suggestions: cached,
      cached: true,
      meta: {
        responseTimeMs: Date.now() - startTime,
        circuitState: scraperCircuitBreaker.getState()
      }
    })
  }

  // Log circuit breaker state
  const cbState = scraperCircuitBreaker.getState()
  console.log('[auto-complete-products-search] Circuit breaker state:', cbState)

  // If circuit breaker is OPEN, reset it after a period to allow retry
  // This helps prevent getting stuck in OPEN state
  if (cbState === 'OPEN') {
    const cbStats = scraperCircuitBreaker.getStats()
    const timeSinceLastFailure = Date.now() - cbStats.lastFailureTime
    console.log('[auto-complete-products-search] Circuit OPEN, time since last failure:', timeSinceLastFailure, 'ms')
  }

  // Deduplicate identical in-flight requests
  const dedupKey = `autocomplete:${cacheKey}`

  try {
    console.log('[auto-complete-products-search] Starting scraping operation...')

    const suggestions = await deduplicatedRequest(dedupKey, async () => {
      // Use circuit breaker for fault tolerance
      return scraperCircuitBreaker.execute(async () => {
        console.log('[auto-complete-products-search] Inside circuit breaker, starting retry wrapper...')
        // Wrap with retry and timeout
        return withRetry(
          () => withTimeout(
            () => {
              console.log('[auto-complete-products-search] Starting scrapeAutocomplete...')
              return scrapeAutocomplete(itemName, locationName, maxResults)
            },
            OPERATION_TIMEOUT_MS,
            'Search operation timed out'
          ),
          { maxAttempts: 2 }
        )
      })
    })

    console.log('[auto-complete-products-search] Scraping complete, got', suggestions.length, 'suggestions')

    // Cache successful results
    autocompleteCache.set(cacheKey, suggestions)

    return NextResponse.json({
      ok: true,
      count: suggestions.length,
      suggestions,
      cached: false,
      meta: {
        responseTimeMs: Date.now() - startTime,
        circuitState: scraperCircuitBreaker.getState()
      }
    })
  } catch (err: any) {
    const elapsed = Date.now() - startTime
    console.error('[auto-complete-products-search] Error after', elapsed, 'ms:', err?.name, '-', err?.message)
    console.error('[auto-complete-products-search] Error stack:', err?.stack)

    // Handle circuit breaker errors specially
    if (err instanceof CircuitBreakerError) {
      console.error('[auto-complete-products-search] Circuit breaker error - service unavailable')
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
