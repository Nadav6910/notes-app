import { NextResponse } from 'next/server';
import { prisma } from '@/prisma'
import { requireAuth, isErrorResponse, verifyNoteOwnership } from '@/lib/auth'

export async function POST(request: Request) {

    // Verify authentication
    const authResult = await requireAuth()
    if (isErrorResponse(authResult)) {
        return authResult
    }
    const session = authResult

    // get body data
    const { noteId } = await request.json()

    // Verify note ownership
    const isOwner = await verifyNoteOwnership(session.user.id, noteId)
    if (!isOwner) {
        return NextResponse.json(
            { error: "Forbidden: You don't own this note", errorCode: "FORBIDDEN" },
            { status: 403 }
        )
    }

    try {

        // delete note
        await prisma.note.delete({
            where: {
                noteId: noteId
            }
        })

        return NextResponse.json({message: "deleted note"})
    }

    catch (error: any) {
        console.log(error)
        return NextResponse.json({error: error.message}, { status: 500 })
    }
}