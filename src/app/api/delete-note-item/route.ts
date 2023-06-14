import { NextResponse } from 'next/server';
import { prisma } from '@/prisma'
 
export async function POST(request: Request) {

    // get body data
    const { entryId } = await request.json()
    
    try {
        
        // delete note
        await prisma.entry.delete({
            where: {
                entryId: entryId
            }
        })

        return NextResponse.json({massage: "deleted item"})
    } 
    
    catch (error: any) {
        console.log(error)
        return NextResponse.json({error: error.message})
    }
}