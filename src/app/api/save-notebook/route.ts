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

    const { noteId, itemName, entryId } = body

    // Validate required fields
    if (!noteId || !itemName) {
        return NextResponse.json({error: "noteId and itemName are required"}, { status: 400 })
    }

    try {
        
        // update entry if there is entryId
        if (entryId) {
            
            const updatedEntry = await prisma.entry.update({
                where: {
                    entryId: entryId
                },
                data: {
                    item: itemName
                }
            })

            return NextResponse.json({message: "success", updatedEntry: updatedEntry})
        }

        // create new entry if there is no entryId
        const createdEntry = await prisma.entry.create({
            data: {
                noteId: noteId,
                item: itemName,
                isChecked: false
            }
        })

        return NextResponse.json({message: "success", createdEntry: createdEntry})
    } 
    
    catch (error: any) {
        console.error('[save-notebook] Error:', error)
        return NextResponse.json({error: error.message}, { status: 500 })
    }
}