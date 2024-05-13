'use client'

import styles from "../../app/my-notes/note/[noteId]/styles/notePage.module.css"
import { useRouter } from "next/navigation"
import { BiArrowBack } from "react-icons/bi"

export default function GoBackContainer() {

    const router = useRouter()

    return (
        <div className={styles.goBackContainer} onClick={() => router.push('/my-notes')}>
            <BiArrowBack />
            <p>Back to notes</p>
        </div>
    )
}
