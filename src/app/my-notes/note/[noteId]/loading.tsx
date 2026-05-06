import styles from "./styles/notePage.module.css"
import ItemsLoadingSkeleton from "@/components/note-page-components/ItemsLoadingSkeleton"
import { Skeleton } from "@mui/material"

export default function NoteLoading() {
    return (
        <main className={styles.notePageContainer}>
            <div style={{ alignSelf: "flex-start", marginBottom: "2.5em", display: "flex", alignItems: "center", gap: "0.3em" }}>
                <Skeleton animation="wave" variant="circular" width={20} height={20} />
                <Skeleton animation="wave" variant="text" width={70} height={22} />
            </div>

            <Skeleton
                animation="wave"
                variant="text"
                width="40%"
                height={36}
                sx={{ alignSelf: "flex-start", marginBottom: "0.5em" }}
            />

            <ItemsLoadingSkeleton />
        </main>
    )
}
