import { NextResponse } from "next/server"

type RateLimitEntry = {
  count: number
  resetAt: number
}

// In-memory rate limit store
// Note: For production with multiple instances, use Redis-based rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries periodically
const CLEANUP_INTERVAL_MS = 60_000 // 1 minute
let lastCleanup = Date.now()

function cleanupExpiredEntries() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return

  lastCleanup = now
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetAt) {
      rateLimitStore.delete(key)
    }
  }
}

export type RateLimitConfig = {
  /** Maximum number of requests allowed in the window */
  limit: number
  /** Time window in milliseconds */
  windowMs: number
  /** Identifier prefix for this rate limiter */
  prefix?: string
}

export type RateLimitResult = {
  success: boolean
  remaining: number
  resetAt: number
}

/**
 * Check rate limit for a given identifier
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanupExpiredEntries()

  const key = config.prefix ? `${config.prefix}:${identifier}` : identifier
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  // No existing entry or expired - create new
  if (!entry || now >= entry.resetAt) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + config.windowMs
    }
    rateLimitStore.set(key, newEntry)
    return {
      success: true,
      remaining: config.limit - 1,
      resetAt: newEntry.resetAt
    }
  }

  // Entry exists and not expired
  if (entry.count >= config.limit) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt
    }
  }

  // Increment count
  entry.count++
  return {
    success: true,
    remaining: config.limit - entry.count,
    resetAt: entry.resetAt
  }
}

/**
 * Get client IP from request headers
 */
export function getClientIp(request: Request): string {
  // Check common headers for IP (in order of preference)
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(",")[0].trim()
  }

  const realIp = request.headers.get("x-real-ip")
  if (realIp) {
    return realIp
  }

  // Vercel-specific header
  const vercelForwardedFor = request.headers.get("x-vercel-forwarded-for")
  if (vercelForwardedFor) {
    return vercelForwardedFor.split(",")[0].trim()
  }

  // Fallback
  return "unknown"
}

/**
 * Rate limit middleware helper - returns error response if rate limited
 */
export function rateLimitResponse(result: RateLimitResult): NextResponse | null {
  if (result.success) {
    return null
  }

  const retryAfterSeconds = Math.ceil((result.resetAt - Date.now()) / 1000)

  return NextResponse.json(
    {
      error: "Rate limit exceeded. Please try again later.",
      errorCode: "RATE_LIMITED",
      retryAfterSeconds
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(result.resetAt)
      }
    }
  )
}

// Pre-configured rate limiters for common use cases
export const RATE_LIMITS = {
  // Scraper endpoints - expensive operations
  scraper: {
    limit: 10,
    windowMs: 60_000, // 10 requests per minute
    prefix: "scraper"
  },
  // Standard API endpoints
  api: {
    limit: 60,
    windowMs: 60_000, // 60 requests per minute
    prefix: "api"
  },
  // Auth-related endpoints
  auth: {
    limit: 5,
    windowMs: 60_000, // 5 requests per minute
    prefix: "auth"
  }
} as const
