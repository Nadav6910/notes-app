import { NextResponse } from 'next/server';
import { prisma } from '@/prisma'
 
export async function POST(request: Request) {

    // get body data
    let body
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({error: "Invalid JSON"}, { status: 400 })
    }

    const { noteId } = body

    // Validate required fields
    if (!noteId) {
        return NextResponse.json({error: "noteId is required"}, { status: 400 })
    }
    
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
        console.error('[delete-note] Error:', error)
        return NextResponse.json({error: error.message}, { status: 500 })
    }
}