'use client'

import styles from "../../app/my-notes/styles/myNotes.module.css"
import { useState, useEffect } from "react";
import {
    Card,
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
import { IoChevronForward } from 'react-icons/io5'
import { MdDelete } from 'react-icons/md'
import { MdModeEditOutline } from 'react-icons/md'
import { FaBook, FaListUl } from 'react-icons/fa'
import MotionWrap from "../../wrappers/MotionWrap"
import { useRouter } from "next/navigation";
import { NoteCardProps } from "../../../types";

const ConfirmDeleteNotePopup = dynamic(() => import('../my-notes-page-components/ConfirmDeleteNotePopup'), {
    loading: () => <Backdrop open={true}><CircularProgress className={styles.backDropLoader} /></Backdrop>,
})

const RenameNotePopupPopup = dynamic(() => import('../my-notes-page-components/RenameNotePopup'), {
    loading: () => <Backdrop open={true}><CircularProgress className={styles.backDropLoader} /></Backdrop>,
})

export default function NoteCardListView({noteName, noteType, createdAt, noteId, entriesCount}: NoteCardProps) {

    const router = useRouter()

    const [openConfirmDelete, setOpenConfirmDelete] = useState<boolean>(false)
    const [openRename, setOpenRename] = useState<boolean>(false)

    const [openSuccess, setOpenSuccess] = useState<boolean>(false)
    const [openSuccessRename, setOpenSuccessRename] = useState<boolean>(false)
    const [openError, setOpenError] = useState<boolean>(false)
    const [openErrorRename, setOpenErrorRename] = useState<boolean>(false)
    const [pageNavLoading, setPageNavLoading] = useState(false)

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
                className={styles.cardWrapListView}
                style={{display: "block", width: "100%"}}
                whileHover={{
                    y: -4,
                    boxShadow: "0px 8px 20px -6px rgba(0,0,0,0.2)",
                    scale: 1.01
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
                <Card className={styles.cardContainerListView}>
                    {/* Left accent border is added via CSS */}
                    <div className={styles.listViewContent}>
                        {/* Note type icon */}
                        <div className={styles.noteTypeIcon} data-note-type={noteType}>
                            {noteType === "Items list" ?
                                <FaListUl /> :
                                <FaBook />
                            }
                        </div>

                        {/* Note info */}
                        <div className={styles.listViewInfo}>
                            <div className={styles.listViewMain}>
                                <p onClick={moveToNotePage} className={styles.noteName}>
                                    {noteName}
                                </p>
                                <span className={styles.noteTypeLabel}>
                                    {noteType}
                                </span>
                            </div>

                            <div className={styles.listViewMetadata}>
                                {noteType === "Items list" && (
                                    <span className={styles.entriesCountListView}>
                                        {
                                        entriesCount === 0 ?
                                        'No Items' :
                                        entriesCount === 1 ?
                                        '1 Item' :
                                        `${entriesCount} Items`
                                        }
                                    </span>
                                )}
                                <span className={styles.createdAtListView}>{formatDate(createdAt)}</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <CardActions disableSpacing className={styles.listViewActions}>
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
                    OnDelete={() => setOpenSuccess(true)}
                    onError={() => setOpenError(true)}
                />
            }

            {openRename &&
                <RenameNotePopupPopup
                    isOpen={openRename}
                    setIsOpen={() => setOpenRename(false)}
                    noteId={noteId}
                    currentName={noteName}
                    OnRename={() => setOpenSuccessRename(true)}
                    onError={() => setOpenErrorRename(true)}
                />
            }

            {openSuccess &&
                <Snackbar
                    open={openSuccess}
                    autoHideDuration={2500}
                    onClose={() => setOpenSuccess(false)}
                    anchorOrigin={{horizontal: "center", vertical: "bottom"}}
                >
                    <Alert onClose={() => setOpenSuccess(false)} severity="success" sx={{ width: '100%' }}>
                        Note deleted successfully!
                    </Alert>
                </Snackbar>
            }

            {openSuccessRename &&
                <Snackbar
                    open={openSuccessRename}
                    autoHideDuration={2500}
                    onClose={() => setOpenSuccessRename(false)}
                    anchorOrigin={{horizontal: "center", vertical: "bottom"}}
                >
                    <Alert onClose={() => setOpenSuccessRename(false)} severity="success" sx={{ width: '100%' }}>
                        Note renamed successfully!
                    </Alert>
                </Snackbar>
            }

            {openError &&
                <Snackbar
                    open={openError}
                    autoHideDuration={2500}
                    onClose={() => setOpenError(false)}
                    anchorOrigin={{horizontal: "center", vertical: "bottom"}}
                >
                    <Alert onClose={() => setOpenError(false)} severity="error" sx={{ width: '100%' }}>
                        There was an issue deleting note, please try again later!
                    </Alert>
                </Snackbar>
            }

            {openErrorRename &&
                <Snackbar
                    open={openErrorRename}
                    autoHideDuration={2500}
                    onClose={() => setOpenErrorRename(false)}
                    anchorOrigin={{horizontal: "center", vertical: "bottom"}}
                >
                    <Alert onClose={() => setOpenErrorRename(false)} severity="error" sx={{ width: '100%' }}>
                        There was an issue renaming note, please try again later!
                    </Alert>
                </Snackbar>
            }
        </>
    )
}
