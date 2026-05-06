// Configuration constants for price comparison and scraping features
export const SCRAPER_CONFIG = {
  // UI Debouncing
  DEBOUNCE_MS: 350,  // Reduced for faster response

  // Autocomplete
  AUTOCOMPLETE_MAX_RESULTS: 10,  // Reduced for faster scraping
  AUTOCOMPLETE_MIN_LENGTH: 3,

  // Price Scraping
  PRICES_MAX_ROWS: 50,  // Reduced for faster loading

  // Browser Management — adaptive keep-alive: short on cold idle so we don't
  // burn memory in serverless, long after a successful scrape so the next
  // request reuses the warm page.
  BROWSER_KEEP_ALIVE_MS: 60_000,            // base (cold idle)
  BROWSER_KEEP_ALIVE_AFTER_HIT_MS: 5 * 60_000,  // 5 min after a successful scrape
  PAGE_NAVIGATION_TIMEOUT: 15_000,
  PAGE_DEFAULT_TIMEOUT: 10_000,

  // Request timeouts - OPTIMIZED for speed
  AUTOCOMPLETE_TIMEOUT_MS: 12_000,
  PRICES_TIMEOUT_MS: 25_000,

  // Fast path timeouts (for optimistic quick attempts)
  FAST_AUTOCOMPLETE_TIMEOUT_MS: 4_000,
  FAST_ADDRESS_TIMEOUT_MS: 3_000,
  FAST_PRODUCT_TIMEOUT_MS: 4_000,

  // Misc internal timeouts
  JQUERY_READY_TIMEOUT_MS: 5_000,
  EVALUATE_HARD_TIMEOUT_MS: 8_000,

  // Geolocation
  GEOLOCATION_TIMEOUT: 6_000,

  // Caching
  CACHE_TTL_MS: 10 * 60_000,
  CACHE_MAX_ENTRIES: 500,

  // Default Values
  DEFAULT_CITY: 'תל אביב',

  // Retry settings — exponential backoff: base * 3^attempt -> 300, 900, 2700
  MAX_RETRIES: 2,
  RETRY_BASE_DELAY_MS: 300,
  RETRY_BACKOFF_FACTOR: 3,

  // Per-IP in-flight queue (queue depth on top of rate-limit)
  PER_IP_QUEUE_DEPTH: 2,
} as const

// Scraper URLs
export const SCRAPER_URLS = {
  HOME: 'https://chp.co.il/',
  ADDRESS_SEL: '#shopping_address',
  PRODUCT_SEL: '#product_name_or_barcode',
  SUBMIT_BTN: '#get_compare_results_button',
  RESULTS_SEL: '#results-table',
} as const

// Allowed hosts for Puppeteer navigation (security: prevents SSRF)
export const ALLOWED_SCRAPER_HOSTS = [
  'chp.co.il',
  'www.chp.co.il',
] as const

// Hosts blocked at the request-interception layer (analytics/ads/social).
export const BLOCKED_SCRAPER_HOSTS = [
  'facebook.com', 'staticxx.facebook.com', 'connect.facebook.net',
  'google-analytics.com', 'googletagmanager.com', 'g.doubleclick.net',
  'doubleclick.net',
  'hotjar.com', 'static.hotjar.com',
  'fullstory.com',
  'clarity.ms',
  'sentry.io',
] as const

// Resource types we actively block to keep the page light. Fonts and media
// are always safe; stylesheets and images we keep allowed because jQuery UI
// autocomplete positioning and the product-image metadata both need them.
export const BLOCKED_RESOURCE_TYPES = new Set<string>([
  'font',
  'media',
  'eventsource',
  'websocket',
  'manifest',
  'other',
])

/**
 * Validate that a URL is safe to navigate to with Puppeteer
 * Prevents SSRF attacks by only allowing whitelisted hosts
 */
export function isAllowedScraperUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    // Only allow https
    if (parsed.protocol !== 'https:') {
      return false
    }
    // Check against allowed hosts
    return ALLOWED_SCRAPER_HOSTS.includes(parsed.hostname as typeof ALLOWED_SCRAPER_HOSTS[number])
  } catch {
    return false
  }
}

/**
 * Safe navigation wrapper - throws if URL is not allowed
 */
export function validateScraperUrl(url: string): void {
  if (!isAllowedScraperUrl(url)) {
    throw new Error(`Navigation to "${url}" is not allowed. Only whitelisted hosts are permitted.`)
  }
}
