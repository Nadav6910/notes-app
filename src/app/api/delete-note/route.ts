import { NextResponse } from 'next/server';
import { prisma } from '@/prisma'
 
export async function POST(request: Request) {

    // get body data
    const { noteId } = await request.json()
    
    try {
        
        // delete note
        await prisma.note.delete({
            where: {
                noteId: noteId
            }
        })

        return NextResponse.json({message: "deleted note"})
    } 
    
    catch (error: any) {
        console.log(error)
        return NextResponse.json({error: error.message})
    }
}