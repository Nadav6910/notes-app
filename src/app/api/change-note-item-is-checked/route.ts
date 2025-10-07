import { NextResponse } from 'next/server';
import { prisma } from '@/prisma'
import Ably from 'ably'

const ably = new Ably.Rest({ key: process.env.ABLY_API_KEY })
 
export async function POST(request: Request) {

    // get body data
    const { clientId, noteId, entryId, value } = await request.json()

    try {
        
        // update entry isChecked value
        await prisma.entry.update({
            where: {
                entryId: entryId
            },
            data: {
                isChecked: value
            }
        })

        // publish to Ably
        const channel = ably.channels.get(`note-${noteId}`)
        await channel.publish('note-item-toggle-checked', { entryId, sender: clientId })

        return NextResponse.json({message: "success"})
    } 
    
    catch (error: any) {
        console.log(error)
        return NextResponse.json({error: error.message})
    }
}