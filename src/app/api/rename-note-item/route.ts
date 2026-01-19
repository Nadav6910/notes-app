import { NextResponse } from 'next/server';
import { prisma } from '@/prisma'
import Ably from 'ably'
import { requireAuth, isErrorResponse, verifyEntryOwnership } from '@/lib/auth'

const ably = new Ably.Rest({ key: process.env.ABLY_API_KEY })

export async function POST(request: Request) {

    // Verify authentication
    const authResult = await requireAuth()
    if (isErrorResponse(authResult)) {
        return authResult
    }
    const session = authResult

    // get body data
    const { clientId, noteId, entryId, newName } = await request.json()

    // Verify entry ownership
    const isOwner = await verifyEntryOwnership(session.user.id, entryId)
    if (!isOwner) {
        return NextResponse.json(
            { error: "Forbidden: You don't own this item", errorCode: "FORBIDDEN" },
            { status: 403 }
        )
    }

    try {

        // rename note item
        await prisma.entry.update({
            where: {
                entryId: entryId
            },
            data: {
                item: newName
            }
        })

        // publish to Ably
        const channel = ably.channels.get(`note-${noteId}`)
        await channel.publish('note-item-renamed', { entryId, newName, sender: clientId })

        return NextResponse.json({message: "renamed note item", newName: newName})
    }

    catch (error: any) {
        console.log(error)
        return NextResponse.json({error: error.message}, { status: 500 })
    }
}