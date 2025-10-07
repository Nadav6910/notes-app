import { NextResponse } from 'next/server';
import { prisma } from '@/prisma'
 
export async function POST(request: Request, response: NextResponse) {

    // get body data
    const { view, userId } = await request.json()

    try {
        
        // create note
        await prisma.user.update({
            where: {
                id: userId
            },
            data: {
                notesView: view
            }
        })

        return NextResponse.json({message: "notes view changed"})
    } 
    
    catch (error: any) {
        console.error(error)
        return NextResponse.json({error: error.message})
    }
}