import Ably from 'ably'

// Persist a stable clientId across page refreshes to avoid duplicate presence members
function getStableClientId(): string {
  if (typeof window === 'undefined') {
    // SSR fallback - won't be used for actual connections
    return `ssr-${Math.random().toString(36).slice(2)}`
  }
  const cached = sessionStorage.getItem('ably-client-id')
  if (cached) return cached
  const generated = Math.random().toString(36).substring(2)
  sessionStorage.setItem('ably-client-id', generated)
  return generated
}

const clientId = getStableClientId()

const ably = new Ably.Realtime({ 
    authUrl: `/api/ably/token?clientId=${encodeURIComponent(clientId)}`,
    clientId,
    // Optionally disable echo if publishing from the same connection
    echoMessages: false
})

export { ably, clientId }