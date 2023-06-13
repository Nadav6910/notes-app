import { NextResponse } from 'next/server';
import { prisma } from '@/prisma'
 
export async function POST(request: Request) {

    // get body data
    const { entryId, value } = await request.json()

    try {
        
        // create note
        await prisma.entry.update({
            where: {
                entryId: entryId
            },
            data: {
                isChecked: value
            }
        })

        return NextResponse.json({massage: "success"})
    } 
    
    catch (error: any) {
        console.log(error)
        return NextResponse.json({error: error.message})
    }
}