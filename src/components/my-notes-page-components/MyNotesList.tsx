'use client'

import styles from "../../app/my-notes/styles/myNotes.module.css"
import { useState, useMemo } from "react"
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
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

    // Memoized animation variants to prevent unnecessary re-renders
    const containerVariants = useMemo(() => ({
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.08,
                delayChildren: 0.1
            }
        }
    }), [])

    const cardVariants = useMemo(() => ({
        hidden: {
            opacity: 0,
            y: 20,
            scale: 0.95
        },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                type: "spring",
                stiffness: 300,
                damping: 25
            }
        }
    }), [])

    const handleChangeView = async (view: string) => {
        setNotesView(view)

        try {
            await fetch('/api/change-notes-view', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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

            <motion.div
                className={notesView === "card" ? styles.notesContainer : styles.notesContainerListView}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                key={notesView} // Re-trigger animation when view changes
            >
                {userNotes?.notes.map((note: NoteCardProps) => (
                    <motion.div
                        key={note.noteId}
                        variants={cardVariants}
                        layout
                    >
                        {notesView === "card" ? (
                            <NoteCard
                                noteName={note.noteName}
                                noteType={note.noteType}
                                createdAt={note.createdAt}
                                noteId={note.noteId}
                                entriesCount={note._count.entries}
                                _count={undefined}
                            />
                        ) : (
                            <NoteCardListView
                                noteName={note.noteName}
                                noteType={note.noteType}
                                createdAt={note.createdAt}
                                noteId={note.noteId}
                                entriesCount={note._count.entries}
                                _count={undefined}
                            />
                        )}
                    </motion.div>
                ))}
            </motion.div>
        </>
    )
}
