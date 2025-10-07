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

    const { clientId, noteId, itemName, selectedPriorityColor, selectedCategory } = body

    // Validate required fields
    if (!noteId || !itemName || !itemName.trim()) {
        return NextResponse.json({error: "noteId and itemName are required"}, { status: 400 })
    }

    try {

        const createdEntry = await prisma.entry.create({
            data: {
                noteId: noteId,
                item: itemName,
                isChecked: false,
                priority: selectedPriorityColor,
                category: selectedCategory
            }
        })

        // publish to Ably
        const channel = ably.channels.get(`note-${noteId}`)
        await channel.publish('note-created', { createdEntry, sender: clientId })

        return NextResponse.json({message: "success", createdEntry: createdEntry})
    } 
    
    catch (error: any) {
        console.error('[create-note-item] Error:', error)
        return NextResponse.json({error: error.message}, { status: 500 })
    }
}