// Configuration constants for price comparison and scraping features
export const SCRAPER_CONFIG = {
  // UI Debouncing
  DEBOUNCE_MS: 350,  // Reduced for faster response

  // Autocomplete
  AUTOCOMPLETE_MAX_RESULTS: 10,  // Reduced for faster scraping
  AUTOCOMPLETE_MIN_LENGTH: 3,

  // Price Scraping
  PRICES_MAX_ROWS: 50,  // Reduced for faster loading

  // Browser Management
  BROWSER_KEEP_ALIVE_MS: 60_000,  // 1 minute - keep browser warm longer
  PAGE_NAVIGATION_TIMEOUT: 15_000,  // Reduced for faster failures
  PAGE_DEFAULT_TIMEOUT: 10_000,  // Reduced

  // Request timeouts - OPTIMIZED for speed
  AUTOCOMPLETE_TIMEOUT_MS: 12_000,  // Reduced from 20s - fail fast
  PRICES_TIMEOUT_MS: 25_000,  // Reduced from 30s

  // Fast path timeouts (for optimistic quick attempts)
  FAST_AUTOCOMPLETE_TIMEOUT_MS: 4_000,  // Quick first attempt
  FAST_ADDRESS_TIMEOUT_MS: 3_000,  // Quick address lookup
  FAST_PRODUCT_TIMEOUT_MS: 4_000,  // Quick product search

  // Geolocation
  GEOLOCATION_TIMEOUT: 6_000,

  // Caching
  CACHE_TTL_MS: 10 * 60_000, // 10 minutes - longer cache for better hit rate
  CACHE_MAX_ENTRIES: 500,  // More cache entries

  // Default Values
  DEFAULT_CITY: 'תל אביב',

  // Retry settings
  MAX_RETRIES: 1,  // Reduced from 2 - fail faster, let user retry
  RETRY_DELAY_MS: 300,  // Reduced from 500
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
