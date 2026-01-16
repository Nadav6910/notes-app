// app/api/price-service-warmup/route.ts
// Lightweight endpoint to pre-warm the browser pool

import { NextResponse } from 'next/server'
import { browserPool, scraperCircuitBreaker } from '@/lib/scraper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    await browserPool.warmup()

    return NextResponse.json({
      ok: true,
      warmed: true,
      stats: browserPool.getStats(),
      circuitState: scraperCircuitBreaker.getState()
    })
  } catch (error: any) {
    console.error('[price-service-warmup] Error:', error?.message)
    return NextResponse.json({
      ok: false,
      error: error?.message || 'Failed to warm up browser'
    }, { status: 500 })
  }
}

// Also support GET for health checks
export async function GET() {
  return NextResponse.json({
    ok: true,
    stats: browserPool.getStats(),
    circuitState: scraperCircuitBreaker.getState()
  })
}
