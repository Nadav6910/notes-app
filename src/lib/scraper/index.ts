// Scraper module exports
export { browserPool, type BrowserPoolConfig } from './browser-pool'
export {
  LRUCache,
  generateCacheKey,
  autocompleteCache,
  pricesCache
} from './cache'
export {
  withRetry,
  withTimeout,
  withRetryAndTimeout,
  type RetryConfig
} from './retry'
export {
  CircuitBreaker,
  CircuitBreakerError,
  scraperCircuitBreaker,
  type CircuitState,
  type CircuitBreakerConfig
} from './circuit-breaker'
export {
  deduplicatedRequest,
  isRequestInFlight,
  getInflightCount
} from './request-dedup'
