import { NextResponse } from 'next/server'
import { getMetricsSnapshot } from '@/lib/scraper-logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const token = process.env.METRICS_TOKEN
  // Disabled unless an explicit token is configured.
  if (!token) {
    return NextResponse.json({ ok: false, error: 'metrics disabled' }, { status: 404 })
  }

  const auth = req.headers.get('authorization') || ''
  const provided = auth.replace(/^Bearer\s+/i, '').trim()
  if (provided !== token) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  return NextResponse.json({ ok: true, metrics: getMetricsSnapshot() }, { status: 200 })
}
