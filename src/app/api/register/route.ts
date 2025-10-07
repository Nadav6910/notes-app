import { NextResponse } from 'next/server';
import { prisma } from '@/prisma'
import bcrypt from 'bcrypt';
 
export async function POST(request: Request) {

    // get body data
    let body
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({error: "Invalid JSON"}, { status: 400 })
    }

    const { name, userName, password } = body

    // Validate required fields
    if (!name || !userName || !password) {
        return NextResponse.json({error: "name, userName, and password are required"}, { status: 400 })
    }

    // Validate password strength
    if (password.length < 6) {
        return NextResponse.json({error: "password must be at least 6 characters"}, { status: 400 })
    }

    // create salt rounds for hash
    const saltRounds = 10

    try {
       
        // Check if user exists
        const userData = await prisma.user.findUnique({where: {userName: userName}})

        if (userData) {
            throw new Error("user already exists")
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
        console.error('[register] Error:', error)
        const status = error.message === "user already exists" ? 409 : 500
        return NextResponse.json({error: error.message}, { status })
    }
}