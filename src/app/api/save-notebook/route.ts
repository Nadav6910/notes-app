import { NextResponse } from 'next/server';
import { prisma } from '@/prisma'
 
export async function POST(request: Request) {

    // get body data
    const { noteId, itemName, entryId } = await request.json()

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

            return NextResponse.json({massage: "success", updatedEntry: updatedEntry})
        }

        // create new entry if there is no entryId
        const createdEntry = await prisma.entry.create({
            data: {
                noteId: noteId,
                item: itemName,
                isChecked: false
            }
        })

        return NextResponse.json({massage: "success", createdEntry: createdEntry})
    } 
    
    catch (error: any) {
        console.log(error)
        return NextResponse.json({error: error.message})
    }
}