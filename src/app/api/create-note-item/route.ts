import { NextResponse } from 'next/server';
import { prisma } from '@/prisma'
 
export async function POST(request: Request) {

    // get body data
    const { noteId, itemName, selectedPriorityColor } = await request.json()

    try {

        if (selectedPriorityColor === "none" || selectedPriorityColor === undefined) {

            // create note with no priority
            const createdEntry = await prisma.entry.create({
                data: {
                    noteId: noteId,
                    item: itemName,
                    isChecked: false
                }
            })

            return NextResponse.json({massage: "success", createdEntry: createdEntry})
        }

        else {
                
            // create note with priority
            const createdEntry = await prisma.entry.create({
                data: {
                    noteId: noteId,
                    item: itemName,
                    isChecked: false,
                    priority: selectedPriorityColor
                }
            })

            return NextResponse.json({massage: "success", createdEntry: createdEntry})
        }
    } 
    
    catch (error: any) {
        console.log(error)
        return NextResponse.json({error: error.message})
    }
}