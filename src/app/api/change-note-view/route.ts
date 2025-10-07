import { NextResponse } from 'next/server';
import { prisma } from '@/prisma'
 
export async function POST(request: Request, response: NextResponse) {

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

        return NextResponse.json({message: "note view changed"})
    } 
    
    catch (error: any) {
        console.log(error)
        return NextResponse.json({error: error.message})
    }
}