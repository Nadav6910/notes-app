// Structured error types for the price scraper. Replaces fragile string-matching
// (`err.message?.includes('timeout')`) with `instanceof` checks. The `.code`
// field is the same shape the existing API contract returns to the client, so
// the frontend keeps working without changes.

export type ScraperErrorCode =
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'BROWSER_DISCONNECTED'
  | 'PRODUCT_NOT_FOUND'
  | 'LOCATION_NOT_FOUND'
  | 'SELECTOR_MISSING'
  | 'RATE_LIMITED'
  | 'INVALID_INPUT'
  | 'UNKNOWN_ERROR'

export class ScraperError extends Error {
  readonly code: ScraperErrorCode
  readonly retryable: boolean

  constructor(code: ScraperErrorCode, message: string, retryable = false) {
    super(message)
    this.name = 'ScraperError'
    this.code = code
    this.retryable = retryable
  }
}

export class ScraperTimeoutError extends ScraperError {
  constructor(op: string) {
    super('TIMEOUT', `Operation timed out: ${op}`, true)
    this.name = 'ScraperTimeoutError'
  }
}

export class BrowserDisconnectedError extends ScraperError {
  constructor(detail?: string) {
    super('BROWSER_DISCONNECTED', `Browser disconnected${detail ? `: ${detail}` : ''}`, true)
    this.name = 'BrowserDisconnectedError'
  }
}

export class NetworkError extends ScraperError {
  constructor(detail?: string) {
    super('NETWORK_ERROR', `Network error${detail ? `: ${detail}` : ''}`, true)
    this.name = 'NetworkError'
  }
}

export class ProductNotFoundError extends ScraperError {
  constructor(query: string) {
    super('PRODUCT_NOT_FOUND', `Product not found: "${query}"`, false)
    this.name = 'ProductNotFoundError'
  }
}

export class LocationNotFoundError extends ScraperError {
  constructor(loc: string) {
    super('LOCATION_NOT_FOUND', `Location not found: "${loc}"`, false)
    this.name = 'LocationNotFoundError'
  }
}

export class SelectorMissingError extends ScraperError {
  constructor(selector: string) {
    super('SELECTOR_MISSING', `Required selector missing: ${selector}`, false)
    this.name = 'SelectorMissingError'
  }
}

export class RateLimitedError extends ScraperError {
  constructor() {
    super('RATE_LIMITED', 'Rate limited', false)
    this.name = 'RateLimitedError'
  }
}

// Convert a raw error from puppeteer / fetch / etc. into a typed ScraperError.
export function toScraperError(err: unknown): ScraperError {
  if (err instanceof ScraperError) return err

  const msg = (err as any)?.message || String(err)
  const name = (err as any)?.name || ''
  const code = (err as any)?.code || ''

  if (name === 'TimeoutError' || /timeout|timed out/i.test(msg)) {
    return new ScraperTimeoutError(msg)
  }
  if (/disconnected|target closed|protocol error/i.test(msg)) {
    return new BrowserDisconnectedError(msg)
  }
  if (/net::|ENOTFOUND|ECONNRESET|ECONNREFUSED|EAI_AGAIN/i.test(msg) || /^ENOTFOUND|^ECON/.test(code)) {
    return new NetworkError(msg)
  }
  if (/failed to select|no widget id/i.test(msg)) {
    return new ProductNotFoundError(msg)
  }

  return new ScraperError('UNKNOWN_ERROR', msg, false)
}

// User-facing message for a given error code. Hebrew + English-friendly.
export function userMessageFor(code: ScraperErrorCode): string {
  switch (code) {
    case 'TIMEOUT':              return 'Price lookup timed out. Please try again.'
    case 'NETWORK_ERROR':        return 'Network error. Please check your connection.'
    case 'BROWSER_DISCONNECTED': return 'Connection lost. Please try again.'
    case 'PRODUCT_NOT_FOUND':    return 'Product not found. Try a different search term.'
    case 'LOCATION_NOT_FOUND':   return 'Location not found. Pick a city manually.'
    case 'SELECTOR_MISSING':     return 'The store layout has changed — we are looking into it.'
    case 'RATE_LIMITED':         return 'Too many requests. Wait a moment and try again.'
    case 'INVALID_INPUT':        return 'Invalid input.'
    default:                     return 'Failed to fetch prices. Please try again.'
  }
}
