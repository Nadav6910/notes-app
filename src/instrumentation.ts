/**
 * Next.js instrumentation hook — runs once when the server starts.
 * Used to validate environment variables early (fail fast on misconfig).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('./lib/env')
    validateEnv()
  }
}
