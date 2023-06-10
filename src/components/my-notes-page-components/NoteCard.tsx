'use client'

import styles from "../../app/my-notes/styles/myNotes.module.css"
import { useState } from "react";
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
import NoteBookCardDrawing from '@/SvgDrawings/NoteBookCardDrawing';
import ListCardDrawing from '@/SvgDrawings/ListCardDrawing';
import { MdDelete } from 'react-icons/md'
import { MdModeEditOutline } from 'react-icons/md'

const ConfirmDeleteNotePopup = dynamic(() => import('../my-notes-page-components/ConfirmDeleteNotePopup'), {
    loading: () => <Backdrop open={true}><CircularProgress className={styles.backDropLoader} /></Backdrop>,
})

const RenameNotePopupPopup = dynamic(() => import('../my-notes-page-components/RenameNotePopup'), {
    loading: () => <Backdrop open={true}><CircularProgress className={styles.backDropLoader} /></Backdrop>,
})

export default function NoteCard({noteName, noteType, createdAt, noteId}: NoteCardProps) {

    const [openConfirmDelete, setOpenConfirmDelete] = useState<boolean>(false)
    const [openRename, setOpenRename] = useState<boolean>(false)

    const [openSuccess, setOpenSuccess] = useState<boolean>(false)
    const [openSuccessRename, setOpenSuccessRename] = useState<boolean>(false)
    const [openError, setOpenError] = useState<boolean>(false)
    const [openErrorRename, setOpenErrorRename] = useState<boolean>(false)

    const formatDate = (dateString: Date) => {
        
        const day = String(dateString.getDate()).padStart(2, '0')
        const month = String(dateString.getMonth() + 1).padStart(2, '0')
        const year = dateString.getFullYear()
        
        const hours = String(dateString.getHours()).padStart(2, '0')
        const minutes = String(dateString.getMinutes()).padStart(2, '0')
        
        return `${day}/${month}/${year} - ${hours}:${minutes}`
    }
    
    return (
        <Card className={styles.cardContainer} >
            {noteType === "Items list" ? <ListCardDrawing /> : <NoteBookCardDrawing />}
            <Divider />
            <CardContent>
                <p className={styles.noteName}>
                    {noteName}
                </p>
                <p className={styles.noteType}>
                    {noteType}
                </p>
            </CardContent>
            <div style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
                <p className={styles.createdAt}>{formatDate(createdAt)}</p>

                <CardActions disableSpacing>
                    <Tooltip title="Edit note">
                        <IconButton
                            onClick={() => setOpenRename(true)} 
                            aria-label="Delete"
                        >
                            <MdModeEditOutline className={styles.iconButton} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete note">
                        <IconButton 
                            onClick={() => setOpenConfirmDelete(true)} 
                            color="error" 
                            aria-label="Edit name"
                        >
                            <MdDelete />
                        </IconButton>
                    </Tooltip>
                </CardActions>
            </div>

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

            <Snackbar
                open={openSuccessRename}
                autoHideDuration={2500}
                onClose={() => setOpenSuccessRename(false)}
                anchorOrigin={{horizontal: "center", vertical: "bottom"}}
            >
                <Alert onClose={() => setOpenSuccess(false)} severity="success" sx={{ width: '100%' }}>
                    Note renamed successfully!
                </Alert>
            </Snackbar>

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

            <Snackbar
                open={openErrorRename}
                autoHideDuration={2500}
                onClose={() => setOpenErrorRename(false)}
                anchorOrigin={{horizontal: "center", vertical: "bottom"}}
            >
                <Alert onClose={() => setOpenError(false)} severity="error" sx={{ width: '100%' }}>
                    There was an issue renaming note, please try again later!
                </Alert>
            </Snackbar>
        </Card>
    )
}
