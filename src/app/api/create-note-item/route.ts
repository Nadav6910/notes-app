import { NextResponse } from 'next/server';
import { prisma } from '@/prisma'
import Ably from 'ably'
import { requireAuth, isErrorResponse, verifyNoteOwnership } from '@/lib/auth'

const ably = new Ably.Rest({ key: process.env.ABLY_API_KEY })

export async function POST(request: Request) {

    // Verify authentication
    const authResult = await requireAuth()
    if (isErrorResponse(authResult)) {
        return authResult
    }
    const session = authResult

    // get body data
    const { clientId, noteId, itemName, selectedPriorityColor, selectedCategory } = await request.json()

    // Verify note ownership
    const isOwner = await verifyNoteOwnership(session.user.id, noteId)
    if (!isOwner) {
        return NextResponse.json(
            { error: "Forbidden: You don't own this note", errorCode: "FORBIDDEN" },
            { status: 403 }
        )
    }

    try {

        const createdEntry = await prisma.entry.create({
            data: {
                noteId: noteId,
                item: itemName,
                isChecked: false,
                priority: selectedPriorityColor,
                category: selectedCategory
            }
        })

        // publish to Ably
        const channel = ably.channels.get(`note-${noteId}`)
        await channel.publish('note-created', { createdEntry, sender: clientId })

        return NextResponse.json({message: "success", createdEntry: createdEntry})
    }

    catch (error: any) {
        console.log(error)
        return NextResponse.json({error: error.message}, { status: 500 })
    }
}