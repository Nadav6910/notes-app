import { NextResponse } from 'next/server';
import { prisma } from '@/prisma'
import { requireAuth, isErrorResponse } from '@/lib/auth'

export async function POST(request: Request) {

    // Verify authentication
    const authResult = await requireAuth()
    if (isErrorResponse(authResult)) {
        return authResult
    }
    const session = authResult

    // get body data
    const { userId, noteType, noteName } = await request.json()

    // Verify the user is creating a note for themselves
    if (userId !== session.user.id) {
        return NextResponse.json(
            { error: "Forbidden: Cannot create notes for other users", errorCode: "FORBIDDEN" },
            { status: 403 }
        )
    }

    try {

        // create note
        await prisma.note.create({
            data: {
                userId: userId,
                noteType: noteType,
                noteName: noteName,
                noteView: "regular"
            }
        })

        return NextResponse.json({message: "created note"})
    }

    catch (error: any) {
        console.log(error)
        return NextResponse.json({error: error.message}, { status: 500 })
    }
}