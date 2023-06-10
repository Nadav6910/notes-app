import { NextResponse } from 'next/server';
import { prisma } from '@/prisma'
 
export async function POST(request: Request) {

    // get body data
    const { noteId, newName } = await request.json()
    
    try {
        
        // delete note
        await prisma.note.update({
            where: {
                noteId: noteId
            },
            data: {
                noteName: newName
            }
        })

        return NextResponse.json({massage: "renamed note"})
    } 
    
    catch (error: any) {
        console.log(error)
        return NextResponse.json({error: error.message})
    }
}