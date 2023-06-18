'use client'

import styles from "../../app/my-notes/note/[noteId]/styles/notePage.module.css"
import { useState, useEffect, useRef } from 'react';
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
  CircularProgress,
} from '@mui/material';
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { AiOutlineSearch } from 'react-icons/ai'
import { MdDelete } from 'react-icons/md'
import { MdModeEditOutline } from 'react-icons/md'
import NoNoteItemsDrawing from "@/SvgDrawings/NoNoteItemsDrawing";
import { Entry } from "../../../types";
import { FaPlus } from 'react-icons/fa'
import { useScroll, AnimatePresence } from 'framer-motion'
import MotionWrap from "@/wrappers/MotionWrap";

const AddNoteItemPopup = dynamic(() => import('./AddNoteItemPopup'), {
  loading: () => <Backdrop open={true}><CircularProgress className={styles.backDropLoader} /></Backdrop>,
})

const DeleteNoteItemPopup = dynamic(() => import('./DeleteNoteItemPopup'), {
  loading: () => <Backdrop open={true}><CircularProgress className={styles.backDropLoader} /></Backdrop>,
})

const RenameNoteItemPopup = dynamic(() => import('./RenameNoteItemPopup'), {
  loading: () => <Backdrop open={true}><CircularProgress className={styles.backDropLoader} /></Backdrop>,
})

export default function NoteItemsList({noteEntries, noteId}: {noteEntries: Entry[] | undefined, noteId: string}) {

  const router = useRouter()

  const { scrollY } = useScroll()

  const [noteItemsState, setNoteItemsState] = useState(noteEntries)
  const [selectedEntryId, setSelectedEntryId] = useState<string>("")
  const [selectedEntryName, setSelectedEntryName] = useState<string>("")
  const [openAddItemPopup, setOpenAddItemPopup] = useState<boolean>(false)
  const [openAddItemPopupEmpty, setOpenAddItemPopupEmpty] = useState<boolean>(false)
  const [openDeleteNoteItemPopup, setOpenDeleteNoteItemPopup] = useState<boolean>(false)
  const [openRenameNoteItemPopup, setOpenRenameNoteItemPopup] = useState<boolean>(false)
  const [openError, setOpenError] = useState<boolean>(false)
  const [openAddItemError, setOpenAddItemError] = useState<boolean>(false)
  const [openDeleteItemError, setOpenDeleteItemError] = useState<boolean>(false)
  const [openRenameItemError, setOpenRenameItemError] = useState<boolean>(false)
  const [loadingCheckingItem, setLoadingCheckingItem] = useState<boolean>(false)
  const [isButtonVisible, setIsButtonVisible] = useState<boolean>(true)
  const [searchTerm, setSearchTerm] = useState<string>("")

  const addItemButtonRef = useRef<HTMLDivElement>(null)

  // Check if the add item button is in view
  useEffect(() => {

    const handleScroll = () => {

      const addItemButton = addItemButtonRef.current

      if (addItemButton) {

        const { top, bottom } = addItemButton.getBoundingClientRect()
        const isElementVisible = top < window.innerHeight && bottom >= 0
        
        if (!isElementVisible && isButtonVisible) {
          // Element is scrolled out of view
          setIsButtonVisible(false)
        }

        else if (isElementVisible && !isButtonVisible) {
          // Element is in view
          setIsButtonVisible(true)
        }
      }
    }

    scrollY.on("change", handleScroll)

    return () => {
      scrollY.clearListeners()
    }

  }, [scrollY, isButtonVisible])
  
  // check and uncheck note item
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

  // search note items
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {

    const inputValue = e.target.value
    setSearchTerm(inputValue)
  }

  const openConfirmDeleteItem = (entryId: string) => {
    setSelectedEntryId(entryId)
    setOpenDeleteNoteItemPopup(true)
  }

  const openConfirmRenameItem = (entryId: string, currentEntryName: string) => {
    setSelectedEntryId(entryId)
    setSelectedEntryName(currentEntryName)
    setOpenRenameNoteItemPopup(true)
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
            onAdd={(newEntry: Entry) => {
              setNoteItemsState((prevEntries) => [...prevEntries ?? [], newEntry]); router.refresh()
            }}
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

        <div 
          onClick={() => setOpenAddItemPopup(true)} 
          className={styles.addItemToNote}
          ref={addItemButtonRef}
        >
            <FaPlus />
            <p>Add Item</p>
        </div>

        <div style={{display: "flex", width: "100%"}}>
          <input 
            onChange={handleSearchInputChange}         
            className={styles.searchInput} 
            placeholder="Search items..."
          />
          <div style={{position: "absolute", padding: "1em"}}><AiOutlineSearch style={{width: "1.2em", height: "1.2em"}} /></div>
        </div>

        <AnimatePresence>
          {!isButtonVisible && 
            <MotionWrap
              className={styles.addItemToNotePopupSticky}
              onClick={() => setOpenAddItemPopup(true)}
              initial={{scale: 0.5, y: 100}}
              animate={{scale: 1, y: 0}}
              exit={{scale: 0.5, y: 100}}
              transition={{duration: 0.5, type: "spring", bounce: 0.25}}
            >
          
              <FaPlus />
            </MotionWrap>
          }
        </AnimatePresence>

        {
          noteItemsState?.filter(entry => {
            if (searchTerm === "") {
              return entry
            }
            else if (entry.item.toLowerCase().includes(searchTerm.toLowerCase())) {
              return entry
            }
          })?.length === 0 ? 

          <p style={{marginTop: "2em"}}>No Results...</p> :
          
          <List className={styles.noteListContainer} sx={{ width: '100%' }}>
          {noteItemsState?.filter(entry => {
            if (searchTerm === "") {
              return entry
            }
            else if (entry.item.toLowerCase().includes(searchTerm.toLowerCase())) {
              return entry
            }
          })?.map((entry, index) => {
            const labelId = `checkbox-list-label-${entry.entryId}`
            const entryPriority = entry.priority && entry.priority

            return (
              <ListItem
                key={entry.entryId}
                className={`${index % 2 === 0 ? styles.noteListItem : styles.noteListItemOdd}`}
                disablePadding
                secondaryAction={
                    <div style={{display: "flex", gap: "1em"}}>
                    <IconButton 
                      onClick={() => openConfirmRenameItem(entry.entryId, entry.item)} 
                      className={styles.iconButtonRename} 
                      edge="end" 
                      aria-label="comments"
                    >
                      <MdModeEditOutline className={styles.iconRename} />
                    </IconButton>

                    <IconButton 
                      onClick={() => openConfirmDeleteItem(entry.entryId)} 
                      className={styles.iconButtonDelete} 
                      edge="end" 
                      aria-label="comments"
                      >
                        <MdDelete className={styles.iconDelete} />
                    </IconButton>
                  </div>
                  }
              >
                <ListItemButton onClick={() => handleToggle(entry?.isChecked, entry?.entryId)} dense>
                  <ListItemIcon sx={{minWidth: "2em"}}>
                    {loadingCheckingItem && selectedEntryId === entry.entryId ? 

                    <div style={{paddingTop: "0.5em", paddingBottom: "0.5em"}}>
                      <CircularProgress size={22} className={styles.loadingCheckingItem} />
                    </div> : 

                    <Checkbox
                      className={styles.noteListCheckbox}
                      edge="start"
                      checked={entry?.isChecked ?? false}
                      tabIndex={-1}
                      disableRipple
                      inputProps={{ 'aria-labelledby': labelId }}
                    />}
                  </ListItemIcon>
                  <div>
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
                    <div style={{display: "flex"}}>
                      <ListItemText className={styles.itemCreatedAt}>
                        {formatDate(entry?.createdAt)}
                      </ListItemText>
                      {entry.priority && 
                      entryPriority === "green" ?
                      <div className={styles.priorityColorGreen} /> :
                      entryPriority === "yellow" ?
                      <div className={styles.priorityColorYellow} /> :
                      entryPriority === "red" &&
                      <div className={styles.priorityColorRed} />
                      }
                    </div>
                  </div>
                </ListItemButton>
              </ListItem>
            )
          })
          }
        </List>}
      </>}

      {openAddItemPopup &&
        <AddNoteItemPopup
          isOpen={openAddItemPopup}
          setIsOpen={() => setOpenAddItemPopup(false)}
          noteId={noteId}
          onAdd={(newEntry: Entry) => setNoteItemsState((prevEntries) => [newEntry, ...prevEntries ?? []])}
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

      {openRenameNoteItemPopup &&
        <RenameNoteItemPopup
          isOpen={openRenameNoteItemPopup}
          setIsOpen={() => {
            setOpenRenameNoteItemPopup(false)
            setSelectedEntryId("")
            setSelectedEntryName("")
          }}
          entryId={selectedEntryId}
          currentName={selectedEntryName}
          onRename={(isRenamed: boolean, newName: string) => {
            if (isRenamed) {
              setNoteItemsState((prevEntries) =>
                prevEntries?.map((entry) =>
                  entry.entryId === selectedEntryId ? { ...entry, item: newName } : entry
                )
              )
            }
          }}
          onError={() => {
            setOpenRenameItemError(true)
            setSelectedEntryId("")
            setSelectedEntryName("")
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

      {openRenameItemError && 
        <Snackbar
          open={openRenameItemError}
          autoHideDuration={2500}
          onClose={() => setOpenRenameItemError(false)}
          anchorOrigin={{horizontal: "center", vertical: "bottom"}}
        >
          <Alert onClose={() => setOpenRenameItemError(false)} severity="error" sx={{ width: '100%' }}>
              Error renaming note item!
          </Alert>
        </Snackbar>
      }
    </>
  )
}