// LRU Cache with TTL for scraping results

interface CacheEntry<T> {
  data: T
  timestamp: number
  hits: number
}

interface CacheConfig {
  maxEntries: number
  ttlMs: number
}

export class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>()
  private config: CacheConfig

  constructor(config: CacheConfig = { maxEntries: 100, ttlMs: 5 * 60 * 1000 }) {
    this.config = config
  }

  get(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    // Check TTL
    if (Date.now() - entry.timestamp > this.config.ttlMs) {
      this.cache.delete(key)
      return null
    }

    entry.hits++
    // Move to end (most recently used)
    this.cache.delete(key)
    this.cache.set(key, entry)

    return entry.data
  }

  set(key: string, data: T): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.config.maxEntries) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) this.cache.delete(oldestKey)
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 0
    })
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    // Check TTL
    if (Date.now() - entry.timestamp > this.config.ttlMs) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  getStats() {
    let totalHits = 0
    let expiredCount = 0
    const now = Date.now()

    for (const [key, entry] of this.cache) {
      totalHits += entry.hits
      if (now - entry.timestamp > this.config.ttlMs) {
        expiredCount++
      }
    }

    return {
      size: this.cache.size,
      maxEntries: this.config.maxEntries,
      ttlMs: this.config.ttlMs,
      totalHits,
      expiredCount
    }
  }

  // Cleanup expired entries
  prune(): number {
    const now = Date.now()
    let pruned = 0

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.config.ttlMs) {
        this.cache.delete(key)
        pruned++
      }
    }

    return pruned
  }
}

// Generate cache key from params
export function generateCacheKey(params: Record<string, unknown>): string {
  const sortedKeys = Object.keys(params).sort()
  const normalized = sortedKeys.reduce((acc, key) => {
    const val = params[key]
    if (val !== undefined && val !== null && val !== '') {
      acc[key] = typeof val === 'string' ? val.trim().toLowerCase() : val
    }
    return acc
  }, {} as Record<string, unknown>)
  return JSON.stringify(normalized)
}

// Pre-configured cache instances
export const autocompleteCache = new LRUCache<any[]>({
  maxEntries: 200,
  ttlMs: 10 * 60 * 1000  // 10 minutes for autocomplete
})

export const pricesCache = new LRUCache<any[]>({
  maxEntries: 100,
  ttlMs: 5 * 60 * 1000   // 5 minutes for prices (more volatile)
})
