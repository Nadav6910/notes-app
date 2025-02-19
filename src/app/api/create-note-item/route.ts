import { NextResponse } from 'next/server';
import { prisma } from '@/prisma'
import Ably from 'ably'

const ably = new Ably.Rest({ key: process.env.ABLY_API_KEY })
 
export async function POST(request: Request) {

    // get body data
    const { clientId, noteId, itemName, selectedPriorityColor, selectedCategory } = await request.json()

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

        return NextResponse.json({massage: "success", createdEntry: createdEntry})
    } 
    
    catch (error: any) {
        console.log(error)
        return NextResponse.json({error: error.message})
    }
}