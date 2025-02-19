import Ably from 'ably'

// Either generate or retrieve a unique id for the client
// const clientId = localStorage.getItem('ably-client-id') || Math.random().toString(36).substring(2)
// localStorage.setItem('ably-client-id', clientId)
const clientId = Math.random().toString(36).substring(2)

const ably = new Ably.Realtime({ 
    authUrl: '/api/ably/token',
    clientId,
    // Optionally disable echo if publishing from the same connection
    echoMessages: false
})

export { ably, clientId }