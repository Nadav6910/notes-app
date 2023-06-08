import styles from "./styles/myNotes.module.css"
import { getServerSession } from "next-auth/next"
import { authOptions } from '../../app/api/auth/[...nextauth]/route'
import { getNotes } from "@/lib/fetchers"
import NoNotesDisplay from "@/components/my-notes-page-components/NoNotesDisplay"
import { redirect } from 'next/navigation'
import AddNotesBtn from "../../components/my-notes-page-components/AddNotesBtn"
import NoteCard from "../../components/my-notes-page-components/NoteCard"

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
    
    return (
        <main>
            {userNotes?.notes.length < 1 ? 
                
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
                        />
                    ))}
                </div>
            </>
            }
        </main>
    )
}