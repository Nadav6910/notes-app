// Two-layer cache for scraped price results:
//   L1 — in-memory LRU (fast, dies on cold start)
//   L2 — Prisma `PriceCache` collection (durable, shared across cold starts)
//
// Lookup order: L1 → L2 → live scrape → write through to both.
// Stale-but-fresh-ish entries are returned with `staleness: 'stale'` so the
// UI can show "Last checked Xm ago" while a background refresh runs.

import { prisma } from '@/prisma'
import { SCRAPER_CONFIG } from './scraper-config'
import { logScraperError, logScraperEvent, recordCacheHit, recordCacheMiss } from './scraper-logger'

export type Staleness = 'fresh' | 'stale' | 'live'

export interface CachedPriceResult<T = unknown> {
  data: T
  createdAt: Date
  staleness: Staleness
  ageMs: number
}

const FRESH_TTL_MS = SCRAPER_CONFIG.CACHE_TTL_MS              // 10 min
const STALE_TTL_MS = 6 * 60 * 60 * 1_000                       // 6 h
const MAX_ENTRIES = SCRAPER_CONFIG.CACHE_MAX_ENTRIES

// ---------- L1: in-memory LRU ----------
interface MemEntry {
  data: unknown
  createdAt: number
  expiry: number
  touched: number
}
const mem = new Map<string, MemEntry>()

function memGet(key: string): MemEntry | null {
  const e = mem.get(key)
  if (!e) return null
  if (Date.now() > e.expiry) {
    mem.delete(key)
    return null
  }
  e.touched = Date.now()
  return e
}

function memSet(key: string, data: unknown, ttlMs: number) {
  if (mem.size >= MAX_ENTRIES) {
    // evict the least recently touched entry
    let oldestKey: string | null = null
    let oldest = Infinity
    for (const [k, v] of mem) {
      if (v.touched < oldest) { oldest = v.touched; oldestKey = k }
    }
    if (oldestKey) mem.delete(oldestKey)
  }
  const now = Date.now()
  mem.set(key, { data, createdAt: now, expiry: now + ttlMs, touched: now })
}

export function buildCacheKey(productName: string, barcode: string | undefined, locationName: string): string {
  return `prices:${productName.trim().toLowerCase()}:${(barcode || '').trim()}:${locationName.trim().toLowerCase()}`
}

// Read from L1 → L2. Returns null on full miss. Returns `staleness: 'stale'` if
// the entry is older than the fresh TTL but younger than the stale TTL.
export async function getCachedPrices<T = unknown>(key: string): Promise<CachedPriceResult<T> | null> {
  // L1
  const m = memGet(key)
  if (m) {
    const age = Date.now() - m.createdAt
    recordCacheHit('memory')
    return {
      data: m.data as T,
      createdAt: new Date(m.createdAt),
      staleness: age < FRESH_TTL_MS ? 'fresh' : 'stale',
      ageMs: age,
    }
  }

  // L2
  try {
    const row = await prisma.priceCache.findUnique({ where: { cacheKey: key } })
    if (!row) {
      recordCacheMiss()
      return null
    }
    const age = Date.now() - row.createdAt.getTime()

    if (age >= STALE_TTL_MS) {
      // expired entirely; clean up lazily
      prisma.priceCache.delete({ where: { cacheKey: key } }).catch(err =>
        logScraperError('price-cache.delete-expired', err, { key }),
      )
      recordCacheMiss()
      return null
    }

    const data = row.payload as T
    // re-warm L1 with whatever life is left
    const remaining = Math.max(1_000, FRESH_TTL_MS - age)
    memSet(key, data, age < FRESH_TTL_MS ? remaining : 60_000)

    recordCacheHit('persistent')
    return {
      data,
      createdAt: row.createdAt,
      staleness: age < FRESH_TTL_MS ? 'fresh' : 'stale',
      ageMs: age,
    }
  } catch (err) {
    logScraperError('price-cache.get', err, { key })
    recordCacheMiss()
    return null
  }
}

// Write through to both L1 and L2. L2 write is best-effort and never throws.
export async function setCachedPrices(key: string, data: unknown): Promise<void> {
  memSet(key, data, FRESH_TTL_MS)

  const expiresAt = new Date(Date.now() + STALE_TTL_MS)
  try {
    await prisma.priceCache.upsert({
      where: { cacheKey: key },
      create: { cacheKey: key, payload: data as any, expiresAt },
      update: { payload: data as any, createdAt: new Date(), expiresAt },
    })
  } catch (err) {
    // L1 still has it; not fatal.
    logScraperError('price-cache.set', err, { key })
  }
}

export function invalidateCachedPrices(key: string): void {
  mem.delete(key)
  prisma.priceCache.delete({ where: { cacheKey: key } }).catch(err =>
    logScraperEvent('warn', 'price-cache.invalidate', 'persistent delete failed', {
      key, errMsg: (err as any)?.message,
    }),
  )
}
