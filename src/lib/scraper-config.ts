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
  BROWSER_KEEP_ALIVE_MS: 45_000,  // Increased for better reuse
  PAGE_NAVIGATION_TIMEOUT: 25_000,  // Reduced for faster failures
  PAGE_DEFAULT_TIMEOUT: 15_000,
  
  // Request timeouts
  AUTOCOMPLETE_TIMEOUT_MS: 20_000,  // Max time for autocomplete request
  PRICES_TIMEOUT_MS: 30_000,  // Max time for prices request
  
  // Geolocation
  GEOLOCATION_TIMEOUT: 6_000,
  
  // Caching
  CACHE_TTL_MS: 5 * 60_000, // 5 minutes - longer cache
  CACHE_MAX_ENTRIES: 200,
  
  // Default Values
  DEFAULT_CITY: 'תל אביב',
  
  // Retry settings
  MAX_RETRIES: 2,
  RETRY_DELAY_MS: 500,
} as const

// Scraper URLs
export const SCRAPER_URLS = {
  HOME: 'https://chp.co.il/',
  ADDRESS_SEL: '#shopping_address',
  PRODUCT_SEL: '#product_name_or_barcode',
  SUBMIT_BTN: '#get_compare_results_button',
  RESULTS_SEL: '#results-table',
} as const
