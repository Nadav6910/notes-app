'use client'

import styles from "../../app/my-notes/styles/myNotes.module.css"
import { useState, useEffect, useCallback } from "react";
import {
    Card,
    CardContent,
    CardActions,
    IconButton,
    Tooltip,
    Snackbar,
    Alert,
    Backdrop,
    CircularProgress
} from '@mui/material';
import dynamic from 'next/dynamic'
import { formatDate } from "@/lib/utils"
import NoteBookCardDrawing from '@/SvgDrawings/NoteBookCardDrawing';
import ListCardDrawing from '@/SvgDrawings/ListCardDrawing';
import { MdDelete } from 'react-icons/md'
import { MdModeEditOutline } from 'react-icons/md'
import { IoChevronForward } from 'react-icons/io5'
import MotionWrap from "../../wrappers/MotionWrap"
import { useRouter } from "next/navigation";
import { NoteCardProps } from "../../../types";

const ConfirmDeleteNotePopup = dynamic(() => import('../my-notes-page-components/ConfirmDeleteNotePopup'), {
    loading: () => <Backdrop open={true}><CircularProgress className={styles.backDropLoader} /></Backdrop>,
})

const RenameNotePopupPopup = dynamic(() => import('../my-notes-page-components/RenameNotePopup'), {
    loading: () => <Backdrop open={true}><CircularProgress className={styles.backDropLoader} /></Backdrop>,
})

export default function NoteCard({noteName, noteType, createdAt, noteId, entriesCount}: NoteCardProps) {

    const router = useRouter()

    const [openConfirmDelete, setOpenConfirmDelete] = useState<boolean>(false)
    const [openRename, setOpenRename] = useState<boolean>(false)
    const [pageNavLoading, setPageNavLoading] = useState(false)

    // Unified notification system - reduces state management complexity
    type NotificationSeverity = 'error' | 'success' | 'info' | 'warning'
    interface Notification {
        open: boolean
        message: string
        severity: NotificationSeverity
    }

    const [notification, setNotification] = useState<Notification>({
        open: false,
        message: '',
        severity: 'info'
    })

    const showNotification = useCallback((message: string, severity: NotificationSeverity) => {
        setNotification({ open: true, message, severity })
    }, [])

    useEffect(() => {
        // Prefetch pages for faster navigation
        router.prefetch(`/my-notes/note/${noteId}`)
    }, [noteId, router])

    const moveToNotePage = () => {
        setPageNavLoading(true)
        router.push(`/my-notes/note/${noteId}`)
    }

    return (
        <>
            {pageNavLoading &&
                <Backdrop sx={{zIndex: 999}} open={true}>
                    <CircularProgress className={styles.backDropLoader} />
                </Backdrop>
            }

            <MotionWrap
                className={styles.cardWrap}
                style={{display: "block", maxWidth: "32em"}}
                whileHover={{
                    y: -8,
                    boxShadow: "0px 12px 24px -8px rgba(0,0,0,0.25)",
                    scale: 1.02
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
                <Card className={styles.cardContainer}>
                    {/* Accent bar based on note type */}
                    <div
                        className={styles.cardAccent}
                        data-note-type={noteType}
                    />

                    <div className={styles.svgContainer}>
                        {
                        noteType === "Items list" ?
                        <ListCardDrawing onClick={moveToNotePage} /> :
                        <NoteBookCardDrawing onClick={moveToNotePage} />
                        }
                    </div>

                    <CardContent className={styles.cardContent}>
                        <p onClick={moveToNotePage} className={styles.noteName}>
                            {noteName}
                        </p>
                        <p className={styles.noteType}>
                            {noteType}
                        </p>
                    </CardContent>

                    <div className={styles.cardFooter}>
                        <div className={styles.cardMetadata}>
                            {noteType === "Items list" && (
                                <span className={styles.entriesCount}>
                                    {
                                    entriesCount === 0 ?
                                    'No Items' :
                                    entriesCount === 1 ?
                                    '1 Item' :
                                    `${entriesCount} Items`
                                    }
                                </span>
                            )}
                            <span className={styles.createdAt}>{formatDate(createdAt)}</span>
                        </div>

                        <CardActions disableSpacing className={styles.cardActions}>
                            <MotionWrap
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.95 }}
                                transition={{ type: "spring", stiffness: 400, damping: 12 }}
                            >
                                <Tooltip title="Edit note">
                                    <IconButton
                                        className={styles.iconButtonRename}
                                        onClick={() => setOpenRename(true)}
                                        aria-label="Edit"
                                    >
                                        <MdModeEditOutline className={styles.iconButton} />
                                    </IconButton>
                                </Tooltip>
                            </MotionWrap>
                            <MotionWrap
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.95 }}
                                transition={{ type: "spring", stiffness: 400, damping: 12 }}
                            >
                                <Tooltip title="Delete note">
                                    <IconButton
                                        className={styles.iconButtonDelete}
                                        onClick={() => setOpenConfirmDelete(true)}
                                        color="error"
                                        aria-label="Delete"
                                    >
                                        <MdDelete />
                                    </IconButton>
                                </Tooltip>
                            </MotionWrap>
                            <MotionWrap
                                whileHover={{ scale: 1.15, x: 3 }}
                                whileTap={{ scale: 0.95 }}
                                transition={{ type: "spring", stiffness: 400, damping: 12 }}
                            >
                                <Tooltip title="Open note">
                                    <IconButton
                                        className={styles.iconButtonView}
                                        onClick={moveToNotePage}
                                        aria-label="View"
                                    >
                                        <IoChevronForward className={styles.iconButton} />
                                    </IconButton>
                                </Tooltip>
                            </MotionWrap>
                        </CardActions>
                    </div>
                </Card>
            </MotionWrap>

            {openConfirmDelete &&
                <ConfirmDeleteNotePopup
                    isOpen={openConfirmDelete}
                    setIsOpen={() => setOpenConfirmDelete(false)}
                    noteId={noteId}
                    noteName={noteName}
                    OnDelete={() => showNotification('Note deleted successfully!', 'success')}
                    onError={() => showNotification('There was an issue deleting note, please try again later!', 'error')}
                />
            }

            {openRename &&
                <RenameNotePopupPopup
                    isOpen={openRename}
                    setIsOpen={() => setOpenRename(false)}
                    noteId={noteId}
                    currentName={noteName}
                    OnRename={() => showNotification('Note renamed successfully!', 'success')}
                    onError={() => showNotification('There was an issue renaming note, please try again later!', 'error')}
                />
            }

            {/* Unified notification system - replaces 4 duplicate snackbars */}
            <Snackbar
                open={notification.open}
                autoHideDuration={2500}
                onClose={() => setNotification(prev => ({ ...prev, open: false }))}
                anchorOrigin={{horizontal: "center", vertical: "bottom"}}
            >
                <Alert
                    onClose={() => setNotification(prev => ({ ...prev, open: false }))}
                    severity={notification.severity}
                    sx={{
                        width: '100%',
                        borderRadius: 2,
                        boxShadow: notification.severity === 'error'
                            ? '0 4px 12px rgba(244,67,54,0.2)'
                            : '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                >
                    {notification.message}
                </Alert>
            </Snackbar>
        </>
    )
}
