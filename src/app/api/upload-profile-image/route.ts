import { NextResponse } from 'next/server';
import { prisma } from '@/prisma'
import { requireAuth, isErrorResponse } from '@/lib/auth'
import { isNonEmptyString, badRequest, serverError } from '@/lib/http'

export async function POST(request: Request) {

    // Verify authentication
    const authResult = await requireAuth()
    if (isErrorResponse(authResult)) {
        return authResult
    }
    const session = authResult

    // get body data
    const { profileImage } = await request.json()

    // validate body
    if (!isNonEmptyString(profileImage)) {
        return badRequest("Missing profile image")
    }

    try {

       // update the authenticated user's profile image
        await prisma.user.update({
            where: {
                id: session.user.id
            },
            data: {
                profileImage: profileImage
            }
        })

        return NextResponse.json({message: "updated profile image"})
    }

    catch (error: any) {
        return serverError(error)
    }
}
