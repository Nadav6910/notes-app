'use client'

import styles from "../../app/my-notes/note/[noteId]/styles/notePage.module.css"
import { useState } from 'react';
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
import { useRouter } from "next/navigation";
import { MdDelete } from 'react-icons/md'
import { MdModeEditOutline } from 'react-icons/md'
import NoNoteItemsDrawing from "@/SvgDrawings/NoNoteItemsDrawing";
import { Entry } from "../../../types";
import { FaPlus } from 'react-icons/fa'

const AddNoteItemPopup = dynamic(() => import('./AddNoteItemPopup'), {
  loading: () => <Backdrop open={true}><CircularProgress className={styles.backDropLoader} /></Backdrop>,
})

const DeleteNoteItemPopup = dynamic(() => import('./DeleteNoteItemPopup'), {
  loading: () => <Backdrop open={true}><CircularProgress className={styles.backDropLoader} /></Backdrop>,
})

export default function NoteItemsList({noteEntries, noteId}: {noteEntries: Entry[] | undefined, noteId: string}) {

  const router = useRouter()

  const [noteItemsState, setNoteItemsState] = useState(noteEntries)
  const [selectedEntryId, setSelectedEntryId] = useState("")
  const [openAddItemPopup, setOpenAddItemPopup] = useState(false)
  const [openAddItemPopupEmpty, setOpenAddItemPopupEmpty] = useState(false)
  const [openDeleteNoteItemPopup, setOpenDeleteNoteItemPopup] = useState(false)
  const [openError, setOpenError] = useState(false)
  const [openAddItemError, setOpenAddItemError] = useState(false)
  const [openDeleteItemError, setOpenDeleteItemError] = useState(false)
  const [loadingCheckingItem, setLoadingCheckingItem] = useState(false)

  const handleToggle = async (value: boolean | null | undefined, entryId: string) => {

    setSelectedEntryId(entryId)
    setLoadingCheckingItem(true)

    const res = await fetch('/api/change-note-item-is-checked', {
      method: 'POST',
      body: JSON.stringify({
        entryId,
        value: !value
      })
    })

    const response = await res.json()

    if (response.massage === "success") { 

      setLoadingCheckingItem(false)
      setSelectedEntryId("")

      setNoteItemsState((prevEntries) =>
        prevEntries?.map((entry) =>
          entry.entryId === entryId ? { ...entry, isChecked: !value } : entry
        )
      )       
    } 

    else {
      setLoadingCheckingItem(false)
      setSelectedEntryId("")
      setOpenError(true)
    }
  }

  const openConfirmDeleteItem = (entryId: string) => {
    setSelectedEntryId(entryId)
    setOpenDeleteNoteItemPopup(true)
  }
  
  return (
    <>

      {noteEntries && noteEntries?.length < 1 ? 

      <>
        <div className={styles.noNoteItemsContainer}>
        <NoNoteItemsDrawing />
        <h3>No items in this note...</h3>
        <div onClick={() => setOpenAddItemPopupEmpty(true)} className={styles.addItemToNoteEmptyNotes}>
          <FaPlus />
          <p>Add Item</p>
        </div>

        {openAddItemPopupEmpty &&
          <AddNoteItemPopup
            isOpen={openAddItemPopupEmpty}
            setIsOpen={() => setOpenAddItemPopupEmpty(false)}
            noteId={noteId}
            onAdd={(newEntry: Entry) => {setNoteItemsState((prevEntries) => [...prevEntries ?? [], newEntry]); router.refresh()}}
            onError={() => setOpenAddItemError(true)}
          />
        }
        </div>
      </> :
      <>

        <h5 style={{marginBottom: "2em", alignSelf: "flex-start"}}>
            {noteItemsState?.length === 1 ? 
            `1 item` : 
            `${noteItemsState?.length} items`}
        </h5>

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

                    <IconButton onClick={() => openConfirmDeleteItem(entry.entryId)} className={styles.iconButtonDelete} edge="end" aria-label="comments">
                        <MdDelete className={styles.iconDelete} />
                    </IconButton>
                  </div>
                  }
              >
                <ListItemButton onClick={() => handleToggle(entry?.isChecked, entry?.entryId)} dense>
                  <ListItemIcon sx={{minWidth: "2em"}}>
                    {loadingCheckingItem && selectedEntryId === entry.entryId ? 

                    <div style={{paddingTop: "0.5em", paddingBottom: "0.5em"}}><CircularProgress size={22} className={styles.loadingCheckingItem} /></div> : 

                    <Checkbox
                      className={styles.noteListCheckbox}
                      edge="start"
                      checked={entry?.isChecked ?? false}
                      tabIndex={-1}
                      disableRipple
                      inputProps={{ 'aria-labelledby': labelId }}
                    />}
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
      </>}

      {openAddItemPopup &&
        <AddNoteItemPopup
          isOpen={openAddItemPopup}
          setIsOpen={() => setOpenAddItemPopup(false)}
          noteId={noteId}
          onAdd={(newEntry: Entry) => setNoteItemsState((prevEntries) => [...prevEntries ?? [], newEntry])}
          onError={() => setOpenAddItemError(true)}
        />
      }

      {openDeleteNoteItemPopup &&
        <DeleteNoteItemPopup
          isOpen={openDeleteNoteItemPopup}
          setIsOpen={() => {
            setOpenDeleteNoteItemPopup(false)
            setSelectedEntryId("")
          }}
          entryId={selectedEntryId}
          OnDelete={(isDeleted: boolean) => setNoteItemsState((prevEntries) => {
            if (isDeleted) {
              if (noteItemsState?.length === 1) {
                router.refresh()
              }

              else {
                return prevEntries?.filter((entry) => entry.entryId !== selectedEntryId)
              }
            }
          })}
          onError={() => {
            setOpenDeleteItemError(true)
            setSelectedEntryId("")
          }}
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

      {openDeleteItemError && 
        <Snackbar
          open={openDeleteItemError}
          autoHideDuration={2500}
          onClose={() => setOpenDeleteItemError(false)}
          anchorOrigin={{horizontal: "center", vertical: "bottom"}}
        >
          <Alert onClose={() => setOpenDeleteItemError(false)} severity="error" sx={{ width: '100%' }}>
              Error deleting note item!
          </Alert>
        </Snackbar>
      }
    </>
  )
}