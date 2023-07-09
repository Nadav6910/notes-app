import { NextResponse } from 'next/server';
import { prisma } from '@/prisma'
 
export async function POST(request: Request) {

    // get body data
    const { noteId, itemName, selectedPriorityColor, selectedCategory } = await request.json()

    try {

        const createdEntry = await prisma.entry.create({
            data: {
                noteId: noteId,
                item: itemName,
                isChecked: false,
                priority: selectedPriorityColor,
                category: selectedCategory
            }
        })

        return NextResponse.json({massage: "success", createdEntry: createdEntry})
    } 
    
    catch (error: any) {
        console.log(error)
        return NextResponse.json({error: error.message})
    }
}