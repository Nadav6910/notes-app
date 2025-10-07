import { NextResponse } from 'next/server';
import { prisma } from '@/prisma'
 
export async function POST(request: Request) {

    // get body data
    const { userId, noteType, noteName } = await request.json()

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
        console.error(error)
        return NextResponse.json({error: error.message})
    }
}