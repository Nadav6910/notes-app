import { NextResponse } from 'next/server';
import { prisma } from '@/prisma'
import Ably from 'ably'

const ably = new Ably.Rest({ key: process.env.ABLY_API_KEY })
 
export async function POST(request: Request) {

    // get body data
    let body
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({error: "Invalid JSON"}, { status: 400 })
    }

    const { clientId, noteId, entryId } = body

    // Validate required fields
    if (!entryId || !noteId) {
        return NextResponse.json({error: "entryId and noteId are required"}, { status: 400 })
    }
    
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

        return NextResponse.json({message: "deleted item"})
    } 
    
    catch (error: any) {
        console.error('[delete-note-item] Error:', error)
        return NextResponse.json({error: error.message}, { status: 500 })
    }
}