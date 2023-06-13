'use client'

import styles from "../../app/my-notes/note/[noteId]/styles/notePage.module.css"
import { useState, useTransition } from 'react';
import { useRouter } from "next/navigation";
import dynamic from 'next/dynamic'
import {
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Checkbox, 
  IconButton, 
  Snackbar, 
  Alert,
  Backdrop,
  CircularProgress
} from '@mui/material';
import { MdDelete } from 'react-icons/md'
import { MdModeEditOutline } from 'react-icons/md'
import NoNoteItemsDrawing from "@/SvgDrawings/NoNoteItemsDrawing";
import { Entry } from "../../../types";
import { FaPlus } from 'react-icons/fa'

const AddNoteItemPopup = dynamic(() => import('../note-page-components/AddNoteItemPopup'), {
  loading: () => <Backdrop open={true}><CircularProgress className={styles.backDropLoader} /></Backdrop>,
})

export default function NoteItemsList({noteEntries, noteId}: {noteEntries: Entry[] | undefined, noteId: string}) {

  const router = useRouter()
  const [, startTransition] = useTransition()

  const [noteItemsState, setNoteItemsState] = useState(noteEntries)
  const [openAddItemPopup, setOpenAddItemPopup] = useState(false)
  const [openError, setOpenError] = useState(false)
  const [openAddItemError, setOpenAddItemError] = useState(false)

  const handleToggle = async (value: boolean | null | undefined, entryId: string) => {

    setNoteItemsState((prevEntries) =>
      prevEntries?.map((entry) =>
        entry.entryId === entryId ? { ...entry, isChecked: !value } : entry
      )
    )

    const res = await fetch('/api/change-note-item-is-checked', {
      method: 'POST',
      body: JSON.stringify({
        entryId,
        value: !value
      })
    })

    const response = await res.json()

    if (response.massage !== "success") {        
      setOpenError(true)
    } 
  }

  if (noteEntries && noteEntries?.length < 1) {

    return (
      <div className={styles.noNoteItemsContainer}>
        <NoNoteItemsDrawing />
        <h3>No items in this note...</h3>
      </div>
    )
  }

  return (
    <>

      <div onClick={() => setOpenAddItemPopup(true)} className={styles.addItemToNote}>
          <FaPlus />
          <p>Add Item</p>
      </div>

      <List className={styles.noteListContainer} sx={{ width: '100%' }}>
        {noteItemsState?.map((entry, index) => {
          const labelId = `checkbox-list-label-${entry.entryId}`

          return (
            <ListItem
              key={entry.entryId}
              className={index % 2 === 0 ? styles.noteListItem : styles.noteListItemOdd}
              disablePadding
              secondaryAction={
                  <div style={{display: "flex", gap: "1em"}}>
                  <IconButton className={styles.iconButtonRename} edge="end" aria-label="comments">
                    <MdModeEditOutline className={styles.iconRename} />
                  </IconButton>

                  <IconButton className={styles.iconButtonDelete} edge="end" aria-label="comments">
                      <MdDelete className={styles.iconDelete} />
                  </IconButton>
                </div>
                }
            >
              <ListItemButton onClick={() => handleToggle(entry?.isChecked, entry?.entryId)} dense>
                <ListItemIcon sx={{minWidth: "2em"}}>
                  <Checkbox
                    className={styles.noteListCheckbox}
                    edge="start"
                    checked={entry?.isChecked ?? false}
                    tabIndex={-1}
                    disableRipple
                    inputProps={{ 'aria-labelledby': labelId }}
                  />
                </ListItemIcon>
                <ListItemText 
                  className={styles.noteListItemText}
                  sx={
                    {
                      textDecoration: entry?.isChecked ? "line-through" : "none", 
                      paddingRight: "3em", 
                      lineBreak: "anywhere",
                    }
                  } 
                  id={labelId} 
                  primary={entry?.item} 
                />
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>

      {openAddItemPopup &&
        <AddNoteItemPopup
          isOpen={openAddItemPopup}
          setIsOpen={() => setOpenAddItemPopup(false)}
          noteId={noteId}
          onAdd={(newEntry: Entry) => setNoteItemsState((prevEntries) => [...prevEntries ?? [], newEntry])}
          onError={() => setOpenAddItemError(true)}
        />
      }

      {openError && 
        <Snackbar
          open={openError}
          autoHideDuration={2500}
          onClose={() => setOpenError(false)}
          anchorOrigin={{horizontal: "center", vertical: "bottom"}}
        >
          <Alert onClose={() => setOpenError(false)} severity="error" sx={{ width: '100%' }}>
              Error changing note status!
          </Alert>
        </Snackbar>
      }

      {openAddItemError && 
        <Snackbar
          open={openAddItemError}
          autoHideDuration={2500}
          onClose={() => setOpenAddItemError(false)}
          anchorOrigin={{horizontal: "center", vertical: "bottom"}}
        >
          <Alert onClose={() => setOpenAddItemError(false)} severity="error" sx={{ width: '100%' }}>
              Error adding new note item!
          </Alert>
        </Snackbar>
      }
    </>
  )
}