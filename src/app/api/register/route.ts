import { NextResponse } from 'next/server';
import { prisma } from '@/prisma'
import bcrypt from 'bcrypt';
 
export async function POST(request: Request) {

    // get body data
    const { name, userName, password } = await request.json()

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

        return NextResponse.json({massage: "user created"})
    } 
    
    catch (error: any) {
        console.log(error)
        return NextResponse.json({error: error.message})
    }
}