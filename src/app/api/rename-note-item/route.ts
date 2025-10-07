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

    const { clientId, noteId, entryId, newName } = body

    // Validate required fields
    if (!entryId || !noteId || !newName || !newName.trim()) {
        return NextResponse.json({error: "entryId, noteId, and newName are required"}, { status: 400 })
    }
    
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

        return NextResponse.json({message: "renamed note item", newName: newName})
    } 
    
    catch (error: any) {
        console.error('[rename-note-item] Error:', error)
        return NextResponse.json({error: error.message}, { status: 500 })
    }
}