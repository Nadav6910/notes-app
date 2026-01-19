import { NextResponse } from 'next/server';
import { prisma } from '@/prisma'
 
export async function POST(request: Request) {

    // get body data
    const { entryId, selectedPriorityColor } = await request.json()
    
    try {
        
        // rename note item
        await prisma.entry.update({
            where: {
                entryId: entryId
            },
            data: {
                priority: selectedPriorityColor
            }
        })

        return NextResponse.json({message: "changed note item priority", newPriority: selectedPriorityColor})
    } 
    
    catch (error: any) {
        console.log(error)
        return NextResponse.json({error: error.message})
    }
}