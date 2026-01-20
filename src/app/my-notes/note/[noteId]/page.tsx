import styles from "../[noteId]/styles/notePage.module.css"
import { getServerSession } from "next-auth/next"
import { authOptions } from '../../../api/auth/[...nextauth]/options'
import { redirect } from 'next/navigation'
import dynamic from 'next/dynamic'
import ItemsLoadingSkeleton from "@/components/note-page-components/ItemsLoadingSkeleton"
import NotebookLoadingSkeleton from "@/components/note-page-components/NotebookLoadingSkeleton"
import { getNoteEntries } from "@/lib/fetchers"
import GoBackContainer from "@/components/note-page-components/GoBackContainer"

const NoteItemsList = dynamic(() => import('@/components/note-page-components/NoteItemsList'), {
    loading: () => <ItemsLoadingSkeleton />,
    ssr: false
})

const NoteBook = dynamic(() => import('@/components/note-page-components/NoteBook'), {
    loading: () => <NotebookLoadingSkeleton />,
    ssr: false
})

export const metadata = {
    title: 'Notes App | Note',
    description: 'Note Items',
}

export default async function NotePage({params}: {params: {noteId: string}}) {

    const { noteId } = params

    // Parallelize session and note data fetching - reduces page load time by ~50%
    const [session, noteEntries] = await Promise.all([
        getServerSession(authOptions),
        getNoteEntries(noteId)
    ])

    if (!session) {
        redirect('/')
    }

    return (
        <main className={styles.notePageContainer}>

            <GoBackContainer />

            <h3 style={{marginBottom: "0.5em", alignSelf: "flex-start"}}>
                {`${noteEntries?.noteName} - ${noteEntries?.noteType}`}
            </h3>

            {
                noteEntries?.noteType === "Items list" ?

                <NoteItemsList
                    noteEntries={noteEntries?.entries}
                    noteView={noteEntries?.noteView}
                    noteId={noteId}
                /> :

                <NoteBook noteEntries={noteEntries?.entries} noteId={noteId} />
            }
        </main>
    )
}
