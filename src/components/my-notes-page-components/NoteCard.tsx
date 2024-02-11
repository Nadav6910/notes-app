'use client'

import styles from "../../app/my-notes/styles/myNotes.module.css"
import { useState, useEffect } from "react";
import { 
    Card, 
    CardContent, 
    CardActions, 
    IconButton, 
    Divider, 
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

    const [openSuccess, setOpenSuccess] = useState<boolean>(false)
    const [openSuccessRename, setOpenSuccessRename] = useState<boolean>(false)
    const [openError, setOpenError] = useState<boolean>(false)
    const [openErrorRename, setOpenErrorRename] = useState<boolean>(false)
    const [pageNavLoading, setPageNavLoading] = useState(false)

    useEffect(() => {
        // Prefetch pages for faster navigation
        router.prefetch('/my-notes/note/[noteId]')
    }, [router])

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
                style={{display: "block", maxWidth: "20em"}}
                whileHover={{y: -5, boxShadow: "0px 0px 10px 0px rgba(0,0,0,0.75)"}}
                transition={{ type: "spring", stiffness: 200, damping: 20, duration: 0.2 }}
            >
                <Card className={styles.cardContainer} >
                    <div className={styles.svgContainer}>
                        {
                        noteType === "Items list" ? 
                        <ListCardDrawing onClick={moveToNotePage} /> : 
                        <NoteBookCardDrawing onClick={moveToNotePage} />
                        }
                    </div>
                    <Divider />
                    <CardContent>
                        <p onClick={moveToNotePage} className={styles.noteName}>
                            {noteName}
                        </p>
                        <p className={styles.noteType}>
                            {noteType}
                        </p>
                    </CardContent>
                    <div 
                        style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}
                    >   
                        <div style={{display: "flex", flexDirection: "column", gap: "0.3em"}}>
                            {noteType === "Items list" ? 
                                <p className={styles.entriesCount}>
                                    {
                                    entriesCount === 0 ?
                                    'No Items' :
                                    entriesCount === 1 ? 
                                    '1 Item' : 
                                    `${entriesCount} Items`
                                    }
                                </p> : null
                            }
                            <p className={styles.createdAt}>{formatDate(createdAt)}</p>
                        </div>

                        <CardActions disableSpacing>
                            <Tooltip title="Edit note">
                                <IconButton
                                    className={styles.iconButtonRename}
                                    onClick={() => setOpenRename(true)} 
                                    aria-label="Delete"
                                >
                                    <MdModeEditOutline className={styles.iconButton} />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete note">
                                <IconButton 
                                    className={styles.iconButtonDelete}
                                    onClick={() => setOpenConfirmDelete(true)} 
                                    color="error" 
                                    aria-label="Edit name"
                                >
                                    <MdDelete />
                                </IconButton>
                            </Tooltip>
                        </CardActions>
                    </div>
                </Card>
            </MotionWrap>

            {openConfirmDelete && 
                <ConfirmDeleteNotePopup
                    isOpen={openConfirmDelete}
                    setIsOpen={() => setOpenConfirmDelete(false)}
                    noteId={noteId}
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
