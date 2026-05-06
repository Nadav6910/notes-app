import styles from "./styles/profilePage.module.css"
import { Skeleton } from "@mui/material"

export default function ProfileLoading() {
    return (
        <main className={styles.profilePageContainer}>
            <Skeleton animation="wave" variant="circular" width={96} height={96} />
            <div className={styles.detailsContainer}>
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className={styles.detailsSubContainer}>
                        <Skeleton animation="wave" variant="text" width={140} height={18} />
                        <Skeleton animation="wave" variant="text" width="60%" height={28} />
                    </div>
                ))}
                <Skeleton
                    animation="wave"
                    variant="rounded"
                    width={170}
                    height={44}
                    sx={{ borderRadius: "12px" }}
                />
            </div>
        </main>
    )
}
