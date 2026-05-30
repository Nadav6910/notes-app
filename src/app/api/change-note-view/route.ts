import { NextResponse } from 'next/server';
import { prisma } from '@/prisma'
import { requireAuth, isErrorResponse, verifyNoteOwnership } from '@/lib/auth'
import { isNonEmptyString, badRequest, forbidden, serverError } from '@/lib/http'

export async function POST(request: Request) {

    // Verify authentication
    const authResult = await requireAuth()
    if (isErrorResponse(authResult)) {
        return authResult
    }
    const session = authResult

    // get body data
    const { view, noteId } = await request.json()

    // validate body
    if (!isNonEmptyString(noteId) || !isNonEmptyString(view)) {
        return badRequest()
    }

    // Verify note ownership
    if (!(await verifyNoteOwnership(session.user.id, noteId))) {
        return forbidden("You don't own this note")
    }

    try {

        // update note view
        await prisma.note.update({
            where: {
                noteId: noteId
            },
            data: {
                noteView: view
            }
        })

        return NextResponse.json({message: "note view changed"})
    }

    catch (error: any) {
        return serverError(error)
    }
}
