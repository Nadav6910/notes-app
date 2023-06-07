'use client'

import styles from "../../app/my-notes/styles/myNotes.module.css"
import { Card, CardContent, CardActions, IconButton, Divider, Tooltip } from '@mui/material';
import NoteBookCardDrawing from '@/SvgDrawings/NoteBookCardDrawing';
import ListCardDrawing from '@/SvgDrawings/ListCardDrawing';
import { MdDelete } from 'react-icons/md'
import { MdModeEditOutline } from 'react-icons/md'

export default function NoteCard({noteName, noteType, createdAt}: NoteCardProps) {

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
                        <IconButton color="error" aria-label="Edit name">
                            <MdDelete />
                        </IconButton>
                    </Tooltip>
                </CardActions>
            </div>
        </Card>
    )
}
