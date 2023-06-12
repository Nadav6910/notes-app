import styles from "./styles/myNotes.module.css"
import { getServerSession } from "next-auth/next"
import dynamic from 'next/dynamic'
import { authOptions } from '../../app/api/auth/[...nextauth]/route'
import { getNotes } from "@/lib/fetchers"
import NoNotesDisplay from "@/components/my-notes-page-components/NoNotesDisplay"
import { redirect } from 'next/navigation'
import AddNotesBtn from "../../components/my-notes-page-components/AddNotesBtn"
import CardLoadingSkeleton from "@/components/my-notes-page-components/CardLoadingSkeleton"

const NoteCard = dynamic(() => import('../../components/my-notes-page-components/NoteCard'), {
    loading: () => <CardLoadingSkeleton />,
    ssr: false
})

export const metadata = {
    title: 'Notes App | My Notes',
    description: 'show notes',
}

export default async function MyNotes() {
    

    const session = await getServerSession(authOptions)

    const userNotes = await getNotes(session?.user.id)
    
    if (!session || !userNotes) {
        redirect('/')
    }

    
    // sort notes by createdAt date to display the most recent note first
    const compareCreatedAt = (a: NoteCardProps, b: NoteCardProps): number => {

        const dateA = new Date(a.createdAt)
        const dateB = new Date(b.createdAt)

        return dateB.getTime() - dateA.getTime()
    }
    
    return (
        <main>
            {userNotes?.notes.length < 1 ? 
                
            <NoNotesDisplay /> :
                
            <>
                <AddNotesBtn />
                    
                <div className={styles.notesContainer}>
                    {userNotes?.notes.sort(compareCreatedAt).map(note => (
                        <NoteCard 
                            key={note.noteId}
                            noteName={note.noteName}
                            noteType={note.noteType} 
                            createdAt={note.createdAt}
                            noteId={note.noteId}
                        />
                    ))}
                </div>
            </>
            }
        </main>
    )
}