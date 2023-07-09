import { NextResponse } from 'next/server';
import { prisma } from '@/prisma'
 
export async function POST(request: Request) {

    // get body data
    const { entryId, selectedCategory } = await request.json()
    
    try {
        
        // rename note item
        await prisma.entry.update({
            where: {
                entryId: entryId
            },
            data: {
                category: selectedCategory
            }
        })

        return NextResponse.json({massage: "changed note item category", newCategory: selectedCategory})
    } 
    
    catch (error: any) {
        console.log(error)
        return NextResponse.json({error: error.message})
    }
}