import { NextResponse } from 'next/server';
import { prisma } from '@/prisma'
import Ably from 'ably'

const ably = new Ably.Rest({ key: process.env.ABLY_API_KEY })
 
export async function POST(request: Request) {

    // get body data
    const { clientId, noteId, entryId } = await request.json()
    
    try {
        
        // delete note
        await prisma.entry.delete({
            where: {
                entryId: entryId
            }
        })

        // publish to Ably
        const channel = ably.channels.get(`note-${noteId}`)
        await channel.publish('note-item-deleted', { entryId, sender: clientId })

        return NextResponse.json({massage: "deleted item"})
    } 
    
    catch (error: any) {
        console.log(error)
        return NextResponse.json({error: error.message})
    }
}