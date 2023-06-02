'use client'

import styles from "../create/styles/createNote.module.css"
import { useState } from "react"
import NoteTypeSelector from "@/components/create-notes-page-components/NoteTypeSelector"

export default function CreateNote() {

  const [noteType, setNoteType] = useState<string>("Items list")
  
  return (
    <main className={styles.createPostPageContainer}>
        <h2 style={{marginBottom: "1em"}}>Create a note</h2>
        <h4 style={{marginBottom: "0.5em"}}>Note type:</h4>
        <NoteTypeSelector createdNoteType={(type: string) => setNoteType(type)} />
    </main>
  )
}
