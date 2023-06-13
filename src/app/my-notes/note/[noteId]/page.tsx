import styles from "../[noteId]/styles/notePage.module.css"
import { getNoteEntries } from "@/lib/fetchers"
import GoBackContainer from "@/components/note-page-components/GoBackContainer"
import NoteItemsList from "@/components/note-page-components/NoteItemsList"

export default async function NotePage({params}: {params: {noteId: string}}) {

    const { noteId } = params

    const noteEntries = await getNoteEntries(noteId)
    
    return (
        <main className={styles.notePageContainer}>
            <GoBackContainer />

            <h3 style={{marginBottom: "2em", alignSelf: "flex-start"}}>
                {`${noteEntries?.noteName} - ${noteEntries?.noteType}`}
            </h3>

            <NoteItemsList noteEntries={noteEntries?.entries} noteId={noteId} />
        </main>
    )
}
