import styles from "./styles/myNotes.module.css"
import CardLoadingSkeleton from "@/components/my-notes-page-components/CardLoadingSkeleton"

export default function MyNotesLoading() {
    return (
        <main>
            <div className={styles.notesContainer}>
                {Array.from({ length: 6 }).map((_, i) => (
                    <CardLoadingSkeleton key={i} />
                ))}
            </div>
        </main>
    )
}
