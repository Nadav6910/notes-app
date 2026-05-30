import { NextResponse } from 'next/server';
import { prisma } from '@/prisma'
import Ably from 'ably'
import { requireAuth, isErrorResponse, verifyEntryOwnership } from '@/lib/auth'
import { isNonEmptyString, badRequest, forbidden, serverError } from '@/lib/http'

const ably = new Ably.Rest({ key: process.env.ABLY_API_KEY })

export async function POST(request: Request) {

    // Verify authentication
    const authResult = await requireAuth()
    if (isErrorResponse(authResult)) {
        return authResult
    }
    const session = authResult

    // get body data
    const { clientId, noteId, entryId, value } = await request.json()

    // validate body
    if (!isNonEmptyString(entryId) || typeof value !== 'boolean') {
        return badRequest()
    }

    // Verify entry ownership
    if (!(await verifyEntryOwnership(session.user.id, entryId))) {
        return forbidden("You don't own this note item")
    }

    try {

        // update entry isChecked value
        await prisma.entry.update({
            where: {
                entryId: entryId
            },
            data: {
                isChecked: value
            }
        })

        // publish to Ably
        const channel = ably.channels.get(`note-${noteId}`)
        await channel.publish('note-item-toggle-checked', { entryId, sender: clientId })

        return NextResponse.json({message: "success"})
    }

    catch (error: any) {
        return serverError(error)
    }
}
