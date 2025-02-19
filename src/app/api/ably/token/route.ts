import { NextResponse } from 'next/server'
import Ably from 'ably'

export async function GET(request: Request) {
  // Extract clientId from query parameters if provided
  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId') || undefined

  // Verify that your secret API key is set
  if (!process.env.ABLY_API_KEY) {
    console.error('Missing ABLY_API_KEY env variable')
    return NextResponse.json({ error: 'Missing ABLY_API_KEY env variable' }, { status: 500 })
  }

  const ably = new Ably.Rest({ key: process.env.ABLY_API_KEY })

  try {
    // Create token request with the optional clientId
    const tokenRequest = await ably.auth.createTokenRequest({ clientId })
    return NextResponse.json(tokenRequest)
  } catch (error: any) {
    console.error('Error generating token:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}