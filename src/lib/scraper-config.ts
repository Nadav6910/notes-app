// Configuration constants for price comparison and scraping features
export const SCRAPER_CONFIG = {
  // UI Debouncing
  DEBOUNCE_MS: 500,
  
  // Autocomplete
  AUTOCOMPLETE_MAX_RESULTS: 15,
  AUTOCOMPLETE_MIN_LENGTH: 3,
  
  // Price Scraping
  PRICES_MAX_ROWS: 200,
  
  // Browser Management
  BROWSER_KEEP_ALIVE_MS: 20_000,
  PAGE_NAVIGATION_TIMEOUT: 35_000,
  PAGE_DEFAULT_TIMEOUT: 12_000,
  
  // Geolocation
  GEOLOCATION_TIMEOUT: 6_000,
  
  // Caching
  CACHE_TTL_MS: 60_000, // 1 minute
  CACHE_MAX_ENTRIES: 100,
  
  // Default Values
  DEFAULT_CITY: 'תל אביב',
} as const

// Scraper URLs
export const SCRAPER_URLS = {
  HOME: 'https://chp.co.il/',
  ADDRESS_SEL: '#shopping_address',
  PRODUCT_SEL: '#product_name_or_barcode',
  SUBMIT_BTN: '#get_compare_results_button',
  RESULTS_SEL: '#results-table',
} as const
