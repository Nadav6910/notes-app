// Request deduplication - coalesce identical in-flight requests

const inflightRequests = new Map<string, Promise<any>>()

/**
 * Deduplicate concurrent requests with the same key.
 * If a request with the same key is already in-flight, returns that promise.
 * Otherwise, executes the request and caches the promise until complete.
 */
export async function deduplicatedRequest<T>(
  key: string,
  request: () => Promise<T>
): Promise<T> {
  const existing = inflightRequests.get(key)
  if (existing) {
    return existing as Promise<T>
  }

  const promise = request().finally(() => {
    inflightRequests.delete(key)
  })

  inflightRequests.set(key, promise)
  return promise
}

/**
 * Check if a request with the given key is currently in-flight
 */
export function isRequestInFlight(key: string): boolean {
  return inflightRequests.has(key)
}

/**
 * Get the number of currently in-flight requests
 */
export function getInflightCount(): number {
  return inflightRequests.size
}

/**
 * Clear all in-flight request tracking (for testing)
 */
export function clearInflightRequests(): void {
  inflightRequests.clear()
}
