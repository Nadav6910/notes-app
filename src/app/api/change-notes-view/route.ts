import { NextResponse } from 'next/server';
import { prisma } from '@/prisma'
import { requireAuth, isErrorResponse } from '@/lib/auth'
import { badRequest, serverError } from '@/lib/http'

export async function POST(request: Request) {

    // Verify authentication
    const authResult = await requireAuth()
    if (isErrorResponse(authResult)) {
        return authResult
    }
    const session = authResult

    // get body data
    const { view } = await request.json()

    // validate body (NotesView enum)
    if (view !== 'card' && view !== 'list') {
        return badRequest("Invalid view")
    }

    try {

        // update the authenticated user's notes view
        await prisma.user.update({
            where: {
                id: session.user.id
            },
            data: {
                notesView: view
            }
        })

        return NextResponse.json({message: "notes view changed"})
    }

    catch (error: any) {
        return serverError(error)
    }
}
