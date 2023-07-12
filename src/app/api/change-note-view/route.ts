import { NextResponse } from 'next/server';
import { prisma } from '@/prisma'
 
export async function POST(request: Request) {

    // get body data
    const { view, noteId } = await request.json()

    try {
        
        // create note
        await prisma.note.update({
            where: {
                noteId: noteId
            },
            data: {
                noteView: view
            }
        })
    } 
    
    catch (error: any) {
        console.log(error)
        return NextResponse.json({error: error.message})
    }
}