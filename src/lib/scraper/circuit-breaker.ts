// Circuit Breaker pattern for fault tolerance

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export interface CircuitBreakerConfig {
  failureThreshold: number
  resetTimeoutMs: number
  halfOpenRequests: number
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
  halfOpenRequests: 2
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED'
  private failureCount = 0
  private lastFailureTime = 0
  private halfOpenSuccesses = 0
  private config: CircuitBreakerConfig

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.config.resetTimeoutMs) {
        this.state = 'HALF_OPEN'
        this.halfOpenSuccesses = 0
        console.log('[CircuitBreaker] Transitioning to HALF_OPEN state')
      } else {
        const waitTime = Math.ceil(
          (this.config.resetTimeoutMs - (Date.now() - this.lastFailureTime)) / 1000
        )
        throw new CircuitBreakerError(
          `Service temporarily unavailable. Please try again in ${waitTime} seconds.`,
          this.state,
          waitTime * 1000
        )
      }
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.halfOpenSuccesses++
      if (this.halfOpenSuccesses >= this.config.halfOpenRequests) {
        this.state = 'CLOSED'
        this.failureCount = 0
        console.log('[CircuitBreaker] Circuit CLOSED - service recovered')
      }
    } else {
      this.failureCount = 0
    }
  }

  private onFailure() {
    this.failureCount++
    this.lastFailureTime = Date.now()

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN'
      console.log('[CircuitBreaker] Circuit OPEN - test request failed')
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'OPEN'
      console.log(
        `[CircuitBreaker] Circuit OPEN after ${this.failureCount} failures`
      )
    }
  }

  getState(): CircuitState {
    return this.state
  }

  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      halfOpenSuccesses: this.halfOpenSuccesses,
      config: this.config
    }
  }

  reset() {
    this.state = 'CLOSED'
    this.failureCount = 0
    this.lastFailureTime = 0
    this.halfOpenSuccesses = 0
  }
}

// Custom error class for circuit breaker
export class CircuitBreakerError extends Error {
  constructor(
    message: string,
    public readonly circuitState: CircuitState,
    public readonly retryAfterMs?: number
  ) {
    super(message)
    this.name = 'CircuitBreakerError'
  }
}

// Singleton instance for the scraper service
export const scraperCircuitBreaker = new CircuitBreaker()
