/**
 * Validates environment variables at server startup so the app fails fast
 * on misconfiguration instead of erroring at request time.
 *
 * - REQUIRED vars throw if missing (the app cannot function without them).
 * - RECOMMENDED vars only warn (related features degrade gracefully).
 *
 * Invoked from src/instrumentation.ts via Next's `register()` hook.
 */

const REQUIRED = ['DATABASE_URL', 'NEXTAUTH_SECRET'] as const

const RECOMMENDED = [
  'NEXTAUTH_URL',
  'ABLY_API_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GITHUB_ID',
  'GITHUB_SECRET',
] as const

export function validateEnv() {
  const missingRequired = REQUIRED.filter((key) => !process.env[key])

  if (missingRequired.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missingRequired.join(', ')}. ` +
        `Set them before starting the server.`
    )
  }

  const missingRecommended = RECOMMENDED.filter((key) => !process.env[key])

  if (missingRecommended.length > 0) {
    console.warn(
      `[env] Missing recommended environment variable(s): ${missingRecommended.join(', ')}. ` +
        `Related features (auth providers, real-time sync) may not work.`
    )
  }
}
