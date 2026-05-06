// Structured JSON-line logger + tiny in-memory metrics ring buffer for the
// price scraper. Replaces silent `catch {}` blocks across the scraper code so
// failures are visible in Vercel/CloudWatch logs and a /_scraper-metrics
// endpoint can return rolled-up counts.

import type { ScraperErrorCode } from './scraper-errors'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface ScraperLogEvent {
  level: LogLevel
  op: string
  msg: string
  durationMs?: number
  err?: { name: string; message: string; stack?: string }
  [extra: string]: unknown
}

const DEBUG = process.env.SCRAPER_DEBUG === '1' || process.env.SCRAPER_DEBUG === 'true'

export function logScraperEvent(
  level: LogLevel,
  op: string,
  msg: string,
  extra: Record<string, unknown> = {},
): void {
  if (level === 'debug' && !DEBUG) return

  const event: ScraperLogEvent = {
    level,
    op,
    msg,
    timestamp: new Date().toISOString(),
    ...extra,
  }

  const line = JSON.stringify(event)
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

export function logScraperError(op: string, err: unknown, extra: Record<string, unknown> = {}): void {
  const e = err as any
  logScraperEvent('error', op, e?.message || String(err), {
    err: { name: e?.name || 'Error', message: e?.message || String(err), stack: DEBUG ? e?.stack : undefined },
    ...extra,
  })
}

// ---------- metrics ring buffer ----------
// Keeps the last N request samples for p50/p95 and a rolling counter map.
// In-memory only — fine for a single Vercel container. Multi-instance
// observability would need an external sink.

const SAMPLE_CAP = 500
const samples: number[] = []
const counters = {
  requests: 0,
  cacheHitsMemory: 0,
  cacheHitsPersistent: 0,
  cacheMisses: 0,
  errors: {} as Record<string, number>,
}

export function recordRequest(durationMs: number): void {
  counters.requests++
  samples.push(durationMs)
  if (samples.length > SAMPLE_CAP) samples.shift()
}

export function recordCacheHit(layer: 'memory' | 'persistent'): void {
  if (layer === 'memory') counters.cacheHitsMemory++
  else counters.cacheHitsPersistent++
}

export function recordCacheMiss(): void {
  counters.cacheMisses++
}

export function recordError(code: ScraperErrorCode | string): void {
  counters.errors[code] = (counters.errors[code] ?? 0) + 1
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
  return sorted[idx]
}

export function getMetricsSnapshot() {
  const sorted = [...samples].sort((a, b) => a - b)
  return {
    requests: counters.requests,
    cacheHits: {
      memory: counters.cacheHitsMemory,
      persistent: counters.cacheHitsPersistent,
    },
    cacheMisses: counters.cacheMisses,
    errors: { ...counters.errors },
    latencyMs: {
      p50: percentile(sorted, 50),
      p95: percentile(sorted, 95),
      p99: percentile(sorted, 99),
      sampleSize: sorted.length,
    },
  }
}
