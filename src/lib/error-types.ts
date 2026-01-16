// Error types and classification for price comparison feature

export type PriceErrorType =
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'SERVICE_UNAVAILABLE'
  | 'CIRCUIT_OPEN'
  | 'NO_RESULTS'
  | 'VALIDATION_ERROR'
  | 'SCRAPING_ERROR'
  | 'UNKNOWN'

export interface PriceError {
  type: PriceErrorType
  message: string
  userMessage: string
  userMessageHe: string
  retryable: boolean
  retryAfterMs?: number
}

/**
 * Classify an error string into a structured PriceError
 */
export function classifyError(error: string, retryAfterMs?: number): PriceError {
  const errorLower = error.toLowerCase()

  // Timeout errors
  if (errorLower.includes('timeout') || errorLower.includes('timed out')) {
    return {
      type: 'TIMEOUT',
      message: error,
      userMessage: 'The request took too long. Please try again.',
      userMessageHe: 'הבקשה לקחה יותר מדי זמן. אנא נסו שוב.',
      retryable: true
    }
  }

  // Circuit breaker open
  if (errorLower.includes('circuit') || errorLower.includes('temporarily unavailable')) {
    return {
      type: 'CIRCUIT_OPEN',
      message: error,
      userMessage: 'Service is temporarily unavailable. Please try again in a moment.',
      userMessageHe: 'השירות אינו זמין כרגע. אנא נסו שוב בעוד מספר דקות.',
      retryable: true,
      retryAfterMs: retryAfterMs || 30000
    }
  }

  // Network errors
  if (
    errorLower.includes('network') ||
    errorLower.includes('fetch') ||
    errorLower.includes('connection') ||
    errorLower.includes('net::err')
  ) {
    return {
      type: 'NETWORK_ERROR',
      message: error,
      userMessage: 'Connection issue. Please check your internet connection.',
      userMessageHe: 'בעיית חיבור לאינטרנט. בדקו את החיבור שלכם.',
      retryable: true
    }
  }

  // Navigation/scraping errors
  if (
    errorLower.includes('navigation') ||
    errorLower.includes('selector') ||
    errorLower.includes('element') ||
    errorLower.includes('scraping')
  ) {
    return {
      type: 'SCRAPING_ERROR',
      message: error,
      userMessage: 'Could not load price data. The service may be experiencing issues.',
      userMessageHe: 'לא ניתן לטעון את נתוני המחירים. השירות עשוי להיות לא זמין.',
      retryable: true
    }
  }

  // Service unavailable
  if (
    errorLower.includes('unavailable') ||
    errorLower.includes('service') ||
    errorLower.includes('503')
  ) {
    return {
      type: 'SERVICE_UNAVAILABLE',
      message: error,
      userMessage: 'The price comparison service is currently unavailable.',
      userMessageHe: 'שירות השוואת המחירים אינו זמין כרגע.',
      retryable: true,
      retryAfterMs: 60000
    }
  }

  // Validation errors
  if (
    errorLower.includes('required') ||
    errorLower.includes('invalid') ||
    errorLower.includes('validation')
  ) {
    return {
      type: 'VALIDATION_ERROR',
      message: error,
      userMessage: 'Invalid search input. Please check your search term.',
      userMessageHe: 'קלט חיפוש לא תקין. אנא בדקו את מונח החיפוש.',
      retryable: false
    }
  }

  // Default unknown error
  return {
    type: 'UNKNOWN',
    message: error,
    userMessage: 'Something went wrong. Please try again.',
    userMessageHe: 'משהו השתבש. אנא נסו שוב.',
    retryable: true
  }
}

/**
 * API response type for price errors
 */
export interface PriceErrorResponse {
  ok: false
  error: string
  errorType: PriceErrorType
  retryable: boolean
  retryAfterMs?: number
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: string,
  retryAfterMs?: number
): PriceErrorResponse {
  const classified = classifyError(error, retryAfterMs)
  return {
    ok: false,
    error: classified.message,
    errorType: classified.type,
    retryable: classified.retryable,
    retryAfterMs: classified.retryAfterMs
  }
}
