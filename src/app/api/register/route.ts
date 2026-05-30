import { NextResponse } from 'next/server';
import { prisma } from '@/prisma'
import bcrypt from 'bcrypt';
import { isNonEmptyString, badRequest, serverError } from '@/lib/http'

export async function POST(request: Request) {

    // get body data
    const { name, userName, password } = await request.json()

    // validate body
    if (!isNonEmptyString(name) || !isNonEmptyString(userName) || !isNonEmptyString(password)) {
        return badRequest("Name, username and password are required")
    }

    // create salt rounds for hash
    const saltRounds = 10

    try {

        // Check if user exists
        const userData = await prisma.user.findUnique({where: {userName: userName}})

        if (userData) {
            return NextResponse.json(
                { error: "user already exists", errorCode: "USER_EXISTS" },
                { status: 409 }
            )
        }

        //hash password
        const hashedPassword = await bcrypt.hash(password, saltRounds)

        // create user
        await prisma.user.create({
            data: {
                name,
                userName,
                password: hashedPassword,
                notesView: "card",
                profileImage: ""
            }
        })

        return NextResponse.json({message: "user created"})
    }

    catch (error: any) {
        return serverError(error)
    }
}
