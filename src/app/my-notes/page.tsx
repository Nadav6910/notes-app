import styles from "./styles/myNotes.module.css"
import { getServerSession } from "next-auth/next"
import dynamic from 'next/dynamic'
import { authOptions } from '../api/auth/[...nextauth]/options'
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
    console.log(session);
    if (!session) {
        redirect('/')
    }

    const userNotes = await getNotes(session?.user.id)
    
    return (
        <main>
            {userNotes && userNotes?.notes.length < 1 ? 
                
            <NoNotesDisplay /> :
                
            <>
                <AddNotesBtn />
                    
                <div className={styles.notesContainer}>
                    {userNotes?.notes.map(note => (
                        <NoteCard 
                            key={note.noteId}
                            noteName={note.noteName}
                            noteType={note.noteType} 
                            createdAt={note.createdAt}
                            noteId={note.noteId}
                            entriesCount={note._count.entries}
                        />
                    ))}
                </div>
            </>
            }
        </main>
    )
}