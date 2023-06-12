import styles from "../[noteId]/styles/notePage.module.css"
import GoBackContainer from "@/components/note-page-components/GoBackContainer"
import NoteItemsList from "@/components/note-page-components/NoteItemsList"
import { FaPlus } from 'react-icons/fa'

export default function NotePage({params}: {params: {noteId: string}}) {

    const { noteId } = params

    return (
        <main className={styles.notePageContainer}>
            <GoBackContainer />

            <div className={styles.addItemToNote}>
                <FaPlus />
                <p>Add Item</p>
            </div>
            <NoteItemsList />
        </main>
    )
}
