import { Params } from "next/dist/shared/lib/router/utils/route-matcher"
import styles from "../[noteId]/styles/notePage.module.css"

export default function page({params}: {params: {noteId: string}}) {

    const { noteId } = params

    return (
        <div>note page {noteId}</div>
    )
}
