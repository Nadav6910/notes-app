// Retry utility with exponential backoff

export interface RetryConfig {
  maxAttempts: number
  initialDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
  retryableErrors: string[]
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableErrors: [
    'Navigation timeout',
    'Timeout',
    'timeout',
    'net::ERR_CONNECTION_RESET',
    'net::ERR_CONNECTION_REFUSED',
    'net::ERR_NETWORK_CHANGED',
    'net::ERR_INTERNET_DISCONNECTED',
    'Protocol error',
    'Target closed',
    'Session closed',
    'Page crashed',
    'Browser disconnected'
  ]
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isRetryableError(error: Error, retryableErrors: string[]): boolean {
  const errorMessage = error?.message || ''
  return retryableErrors.some(re => errorMessage.includes(re))
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config }
  let lastError: Error | null = null
  let delay = cfg.initialDelayMs

  for (let attempt = 1; attempt <= cfg.maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error: any) {
      lastError = error

      const shouldRetry = isRetryableError(error, cfg.retryableErrors)

      if (!shouldRetry || attempt === cfg.maxAttempts) {
        throw error
      }

      console.warn(
        `[Retry] Attempt ${attempt}/${cfg.maxAttempts} failed: ${error?.message}. ` +
        `Retrying in ${delay}ms...`
      )

      await sleep(delay)
      delay = Math.min(delay * cfg.backoffMultiplier, cfg.maxDelayMs)
    }
  }

  throw lastError
}

// Wrapper with operation timeout
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = 'Operation timeout'
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    )
  ])
}

// Combined retry with timeout
export async function withRetryAndTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  retryConfig: Partial<RetryConfig> = {}
): Promise<T> {
  return withRetry(
    () => withTimeout(operation, timeoutMs),
    retryConfig
  )
}
