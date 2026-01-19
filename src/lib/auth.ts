import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/options"
import { NextResponse } from "next/server"
import { prisma } from "@/prisma"

export type AuthSession = {
  user: {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

/**
 * Get the authenticated session or return null
 */
export async function getAuthSession(): Promise<AuthSession | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return null
  }
  return session as AuthSession
}

/**
 * Require authentication - returns session or throws 401 response
 */
export async function requireAuth(): Promise<AuthSession | NextResponse> {
  const session = await getAuthSession()
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized", errorCode: "UNAUTHORIZED" },
      { status: 401 }
    )
  }
  return session
}

/**
 * Verify that the authenticated user owns the specified note
 */
export async function verifyNoteOwnership(
  userId: string,
  noteId: string
): Promise<boolean> {
  try {
    const note = await prisma.note.findUnique({
      where: { noteId },
      select: { userId: true }
    })
    return note?.userId === userId
  } catch {
    return false
  }
}

/**
 * Verify that the authenticated user owns the specified entry (via its note)
 */
export async function verifyEntryOwnership(
  userId: string,
  entryId: string
): Promise<boolean> {
  try {
    const entry = await prisma.entry.findUnique({
      where: { entryId },
      select: { note: { select: { userId: true } } }
    })
    return entry?.note?.userId === userId
  } catch {
    return false
  }
}

/**
 * Check if response is a NextResponse (used for type narrowing)
 */
export function isErrorResponse(result: AuthSession | NextResponse): result is NextResponse {
  return result instanceof NextResponse
}
