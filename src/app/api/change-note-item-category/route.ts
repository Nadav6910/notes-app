import { NextResponse } from 'next/server';
import { prisma } from '@/prisma'
import { requireAuth, isErrorResponse, verifyEntryOwnership } from '@/lib/auth'
import { isNonEmptyString, badRequest, forbidden, serverError } from '@/lib/http'

export async function POST(request: Request) {

    // Verify authentication
    const authResult = await requireAuth()
    if (isErrorResponse(authResult)) {
        return authResult
    }
    const session = authResult

    // get body data
    const { entryId, selectedCategory } = await request.json()

    // validate body
    if (!isNonEmptyString(entryId) || typeof selectedCategory !== 'string') {
        return badRequest()
    }

    // Verify entry ownership
    if (!(await verifyEntryOwnership(session.user.id, entryId))) {
        return forbidden("You don't own this note item")
    }

    try {

        // change note item category
        await prisma.entry.update({
            where: {
                entryId: entryId
            },
            data: {
                category: selectedCategory
            }
        })

        return NextResponse.json({message: "changed note item category", newCategory: selectedCategory})
    }

    catch (error: any) {
        return serverError(error)
    }
}
