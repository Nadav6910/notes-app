import { NextResponse } from 'next/server';
import { prisma } from '@/prisma'
import { requireAuth, isErrorResponse, verifyEntryOwnership, verifyNoteOwnership } from '@/lib/auth'
import { isNonEmptyString, badRequest, forbidden, serverError } from '@/lib/http'

export async function POST(request: Request) {

    // Verify authentication
    const authResult = await requireAuth()
    if (isErrorResponse(authResult)) {
        return authResult
    }
    const session = authResult

    // get body data
    const { noteId, itemName, entryId } = await request.json()

    if (typeof itemName !== 'string') {
        return badRequest()
    }

    try {

        // update entry if there is entryId
        if (entryId) {

            if (!isNonEmptyString(entryId)) {
                return badRequest()
            }

            // Verify ownership of the entry being updated
            if (!(await verifyEntryOwnership(session.user.id, entryId))) {
                return forbidden("You don't own this note item")
            }

            const updatedEntry = await prisma.entry.update({
                where: {
                    entryId: entryId
                },
                data: {
                    item: itemName
                }
            })

            return NextResponse.json({message: "success", updatedEntry: updatedEntry})
        }

        // create new entry if there is no entryId
        if (!isNonEmptyString(noteId)) {
            return badRequest()
        }

        // Verify ownership of the note the entry is created under
        if (!(await verifyNoteOwnership(session.user.id, noteId))) {
            return forbidden("You don't own this note")
        }

        const createdEntry = await prisma.entry.create({
            data: {
                noteId: noteId,
                item: itemName,
                isChecked: false
            }
        })

        return NextResponse.json({message: "success", createdEntry: createdEntry})
    }

    catch (error: any) {
        return serverError(error)
    }
}
