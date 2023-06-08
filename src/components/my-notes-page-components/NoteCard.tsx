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
    Alert
} from '@mui/material';
import NoteBookCardDrawing from '@/SvgDrawings/NoteBookCardDrawing';
import ListCardDrawing from '@/SvgDrawings/ListCardDrawing';
import { MdDelete } from 'react-icons/md'
import { MdModeEditOutline } from 'react-icons/md'
import ConfirmDeleteNotePopup from "./ConfirmDeleteNotePopup";

export default function NoteCard({noteName, noteType, createdAt, noteId}: NoteCardProps) {

    const [openConfirmDelete, setOpenConfirmDelete] = useState(false)
    const [openSuccess, setOpenSuccess] = useState<boolean>(false)
    const [openError, setOpenError] = useState<boolean>(false)

    const formatDate = (dateString: Date) => {
        
        const day = String(dateString.getDate()).padStart(2, '0')
        const month = String(dateString.getMonth() + 1).padStart(2, '0')
        const year = dateString.getFullYear()
        
        const hours = String(dateString.getHours()).padStart(2, '0')
        const minutes = String(dateString.getMinutes()).padStart(2, '0')
        
        return `${day}/${month}/${year} - ${hours}:${minutes}`
    }
    
    return (
        <Card sx={{backgroundColor: "#eeeeee"}} >
            {noteType === "Items list" ? <ListCardDrawing /> : <NoteBookCardDrawing />}
            <Divider />
            <CardContent>
                <p className={styles.noteName}>
                    {noteName}
                </p>
                <p style={{fontSize: "0.8em"}}>
                    {noteType}
                </p>
            </CardContent>
            <div style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
                <p style={{fontSize: "0.7em", paddingLeft: "16px"}}>{formatDate(createdAt)}</p>

                <CardActions disableSpacing>
                    <Tooltip title="Edit note">
                        <IconButton aria-label="Delete">
                            <MdModeEditOutline />
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
                open={openError}
                autoHideDuration={2500}
                onClose={() => setOpenError(false)}
                anchorOrigin={{horizontal: "center", vertical: "bottom"}}
            >
                <Alert onClose={() => setOpenError(false)} severity="error" sx={{ width: '100%' }}>
                    There was an issue deleting note, please try again later!
                </Alert>
            </Snackbar>
        </Card>
    )
}
