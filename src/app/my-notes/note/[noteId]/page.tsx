import styles from "../[noteId]/styles/notePage.module.css"
import { getServerSession } from "next-auth/next"
import { authOptions } from '../../../api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import dynamic from 'next/dynamic'
import ItemsLoadingSkeleton from "@/components/note-page-components/ItemsLoadingSkeleton"
import { getNoteEntries } from "@/lib/fetchers"
import GoBackContainer from "@/components/note-page-components/GoBackContainer"

const NoteItemsList = dynamic(() => import('@/components/note-page-components/NoteItemsList'), {
    loading: () => <ItemsLoadingSkeleton />,
    ssr: false
})

export const metadata = {
    title: 'Notes App | Note',
    description: 'Note Items',
}

export default async function NotePage({params}: {params: {noteId: string}}) {

    const session = await getServerSession(authOptions)
   
    if (!session) {
        redirect('/')
    }

    const { noteId } = params

    const noteEntries = await getNoteEntries(noteId)
    
    return (
        <main className={styles.notePageContainer}>
            
            <GoBackContainer />

            <h3 style={{marginBottom: "0.5em", alignSelf: "flex-start"}}>
                {`${noteEntries?.noteName} - ${noteEntries?.noteType}`}
            </h3>
            
            <NoteItemsList noteEntries={noteEntries?.entries} noteId={noteId} />
        </main>
    )
}
