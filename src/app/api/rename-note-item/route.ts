import { NextResponse } from 'next/server';
import { prisma } from '@/prisma'
import Ably from 'ably'

const ably = new Ably.Rest({ key: process.env.ABLY_API_KEY })
 
export async function POST(request: Request) {

    // get body data
    const { clientId, noteId, entryId, newName } = await request.json()
    
    try {
        
        // rename note item
        await prisma.entry.update({
            where: {
                entryId: entryId
            },
            data: {
                item: newName
            }
        })

        // publish to Ably
        const channel = ably.channels.get(`note-${noteId}`)
        await channel.publish('note-item-renamed', { entryId, newName, sender: clientId })

        return NextResponse.json({massage: "renamed note item", newName: newName})
    } 
    
    catch (error: any) {
        console.log(error)
        return NextResponse.json({error: error.message})
    }
}