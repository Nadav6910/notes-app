'use client'

import styles from "../../app/my-notes/styles/myNotes.module.css"
import { useState } from "react"
import dynamic from 'next/dynamic'
import CardLoadingSkeleton from "@/components/my-notes-page-components/CardLoadingSkeleton"
import CardLoadingSkeletonListView from "@/components/my-notes-page-components/CardLoadingSkeletonListView"
import AddNotesBtn from "../../components/my-notes-page-components/AddNotesBtn"
import SwitchNotesViewBtn from "../../components/my-notes-page-components/SwitchNotesViewBtn"
import { NoteCardProps } from "../../../types"

const NoteCard = dynamic(() => import('../../components/my-notes-page-components/NoteCard'), {
    loading: () => <CardLoadingSkeleton />,
    ssr: false
})

const NoteCardListView = dynamic(() => import('../../components/my-notes-page-components/NoteCardListView'), {
    loading: () => <CardLoadingSkeletonListView />,
    ssr: false
})

export default function MyNotesList(
    {userNotes, notesViewSelect, userId}: {userNotes: any, notesViewSelect: string | undefined, userId: string}
) {

    const [notesView, setNotesView] = useState(notesViewSelect)

    const handleChangeView = async (view: string) => {
        setNotesView(view)

        try {
            await fetch('/api/change-notes-view', {
                method: 'POST',
                body: JSON.stringify({
                  userId,
                  view
                })
            })
        } 
        
        catch (error) {
          console.log(error)
        }
    }
    
    return (
        <>
            {/* <button 
                onClick={
                    async () => {
                        const response = await fetch('/api/scrape-item-prices', {
                            method: 'POST',
                            headers: {
                            'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({itemName: 'חלב'})
                        })
                        const data = await response.json()
                        console.log(data)
                    }} 
            >
                Scrape
            </button> */}
            <div 
                style={{
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center",
                    marginBottom: "2em"
                }}
            >
                <AddNotesBtn />
                <SwitchNotesViewBtn 
                    changeNotesView={(view: string) => handleChangeView(view)}
                    currentNotesView={notesView}
                />
            </div>
                
            <div className={notesView === "card" ? styles.notesContainer : styles.notesContainerListView}>
                {userNotes?.notes.map((note: NoteCardProps) => (
                    notesView === "card" ?

                    <NoteCard 
                        key={note.noteId}
                        noteName={note.noteName}
                        noteType={note.noteType}
                        createdAt={note.createdAt}
                        noteId={note.noteId}
                        entriesCount={note._count.entries} _count={undefined}                    
                    /> :

                    <NoteCardListView 
                        key={note.noteId}
                        noteName={note.noteName}
                        noteType={note.noteType}
                        createdAt={note.createdAt}
                        noteId={note.noteId}
                        entriesCount={note._count.entries} _count={undefined}
                    />
                ))}
            </div>
        </>
    )
}
