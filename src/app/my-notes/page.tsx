import { getServerSession } from "next-auth/next"
import { authOptions } from '../../app/api/auth/[...nextauth]/route'
import NoNotesDisplay from "@/components/my-notes-page-components/NoNotesDisplay"
import { prisma } from '@/prisma'
import { redirect } from 'next/navigation'
import AddNotesBtn from "@/components/my-notes-page-components/addNotesBtn"

export const metadata = {
    title: 'Notes App | My Notes',
    description: 'show notes',
  }

export default async function MyNotes() {

    const session = await getServerSession(authOptions)

    const user = await prisma.user.findUnique({
        where: {
            id: session?.user.id
        },
        select: {
            notes: true
        }
    })

    if (!session || !user) {
        redirect('/')
    }
    
    return (
        <main>
            {user?.notes.length < 1 ? 
                
            <NoNotesDisplay /> :
                
            <>
                <AddNotesBtn />
                    
                {user?.notes.map(note => (
                    <p key={note.noteId}>{note.noteName}</p>
                ))}
            </>
                
            }
        </main>
    )
}