import styles from "../[noteId]/styles/notePage.module.css"
import { getServerSession } from "next-auth/next"
import { authOptions } from '../../../api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { getNoteEntries } from "@/lib/fetchers"
import GoBackContainer from "@/components/note-page-components/GoBackContainer"
import NoteItemsList from "@/components/note-page-components/NoteItemsList"
import { Entry } from "../../../../../types"

export const metadata = {
    title: 'Notes App | Note',
    description: 'Note Items',
}

export default async function NotePage({params}: {params: {noteId: string}}) {

    const session = await getServerSession(authOptions)
   
    if (!session) {
        redirect('/')
    }

    const compareCreatedAt = (a: Entry, b: Entry): number => {

        const dateA = new Date(a.createdAt)
        const dateB = new Date(b.createdAt)

        return dateB.getTime() - dateA.getTime()
    }

    const { noteId } = params

    const noteEntries = await getNoteEntries(noteId)
    
    return (
        <main className={styles.notePageContainer}>
            <GoBackContainer />

            <h3 style={{marginBottom: "0.5em", alignSelf: "flex-start"}}>
                {`${noteEntries?.noteName} - ${noteEntries?.noteType}`}
            </h3>

            <NoteItemsList noteEntries={noteEntries?.entries.sort(compareCreatedAt)} noteId={noteId} />
        </main>
    )
}
