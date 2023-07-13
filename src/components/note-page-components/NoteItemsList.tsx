'use client'

import styles from "../../app/my-notes/note/[noteId]/styles/notePage.module.css"
import { useState, useEffect, useRef } from 'react'
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
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material'
import { useRouter } from "next/navigation"
import { formatDate } from "@/lib/utils"
import { AiOutlineSearch } from 'react-icons/ai'
import { MdDelete } from 'react-icons/md'
import { MdModeEditOutline } from 'react-icons/md'
import NoNoteItemsDrawing from "@/SvgDrawings/NoNoteItemsDrawing"
import { Entry } from "../../../types"
import { FaPlus } from 'react-icons/fa'
import { MdOutlineCancel } from 'react-icons/md'
import { BsChevronDown } from 'react-icons/bs'
import { useScroll, AnimatePresence } from 'framer-motion'
import MotionWrap from "@/wrappers/MotionWrap"
import SortingMenu from "./SortingMenu"
import SwitchNoteViewBtn from "./SwitchNoteViewBtn"

const AddNoteItemPopup = dynamic(() => import('./AddNoteItemPopup'), {
  loading: () => <Backdrop open={true}><CircularProgress className={styles.backDropLoader} /></Backdrop>,
})

const DeleteNoteItemPopup = dynamic(() => import('./DeleteNoteItemPopup'), {
  loading: () => <Backdrop open={true}><CircularProgress className={styles.backDropLoader} /></Backdrop>,
})

const RenameNoteItemPopup = dynamic(() => import('./RenameNoteItemPopup'), {
  loading: () => <Backdrop open={true}><CircularProgress className={styles.backDropLoader} /></Backdrop>,
})

interface GroupedData {
  category: string
  data: Entry[]
}

export default function NoteItemsList({noteEntries, noteView, noteId}: {noteEntries: Entry[] | undefined, noteView: string, noteId: string}) {

  const router = useRouter()

  const { scrollY } = useScroll()

  const [noteItemsState, setNoteItemsState] = useState(noteEntries)
  const [selectedEntryId, setSelectedEntryId] = useState<string>("")
  const [selectedEntryName, setSelectedEntryName] = useState<string>("")
  const [selectedEntryPriority, setSelectedEntryPriority] = useState<string>("")
  const [selectedEntryCategory, setSelectedEntryCategory] = useState("")
  const [openAddItemPopup, setOpenAddItemPopup] = useState<boolean>(false)
  const [openAddItemPopupEmpty, setOpenAddItemPopupEmpty] = useState<boolean>(false)
  const [openDeleteNoteItemPopup, setOpenDeleteNoteItemPopup] = useState<boolean>(false)
  const [openRenameNoteItemPopup, setOpenRenameNoteItemPopup] = useState<boolean>(false)
  const [openError, setOpenError] = useState<boolean>(false)
  const [openAddItemError, setOpenAddItemError] = useState<boolean>(false)
  const [openDeleteItemError, setOpenDeleteItemError] = useState<boolean>(false)
  const [openRenameItemError, setOpenRenameItemError] = useState<boolean>(false)
  const [openSetPriorityError, setOpenSetPriorityError] = useState<boolean>(false)
  const [openSetCategoryError, setOpenSetCategoryError] = useState<boolean>(false)
  const [isButtonVisible, setIsButtonVisible] = useState<boolean>(true)
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [sortMethod, setSortMethod] = useState<string>("newToOld")
  const [noteViewSelect, setNoteViewSelect] = useState<string>(noteView)
  const [ChecksCount, SetChecksCount] = useState(noteEntries?.filter(entry => entry.isChecked).length)
  const [UnCheckedCount, SetUnCheckedCount] = useState(noteEntries?.filter(entry => !entry.isChecked).length)
  const [expendedCategory, setExpendedCategory] = useState(Array.from(
    noteItemsState!.reduce((categorySet: Set<string>, entry: Entry) => {
      const category = entry.category ?? "no category";
      categorySet.add(category)
      return categorySet;
    }, new Set<string>())
  ))
  
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

  // get checked and unchecked items count
  useEffect(() => {

    const getCheckedAndUncheckedItems = () => {
      
      let checkedItemsCount = 0
      let uncheckedItemsCount = 0
  
      noteItemsState?.forEach(entry => {
        if (entry.isChecked) {
          checkedItemsCount += 1
        }
        else {
          uncheckedItemsCount += 1
        }
      })
  
      SetChecksCount(checkedItemsCount)
      SetUnCheckedCount(uncheckedItemsCount)
    }

    getCheckedAndUncheckedItems()

  }, [noteItemsState])
  
  // check and uncheck note item
  const handleToggle = async (value: boolean | null | undefined, entryId: string) => {
    
    setNoteItemsState((prevEntries) =>
      prevEntries?.map((entry) =>
        entry.entryId === entryId ? { ...entry, isChecked: !value } : entry
      )
    )
    
    if (sortMethod === "byChecked") {
      setNoteItemsState((prevEntries: Entry[] | undefined) => {
        return prevEntries?.sort((a: Entry, b: Entry) => {
          if (a.isChecked && !b.isChecked) {
            return 1
          }
          else if (!a.isChecked && b.isChecked) {
            return -1
          }
          else {
            return 0
          }
        })
      })
    }

    try {

      await fetch('/api/change-note-item-is-checked', {
        method: 'POST',
        body: JSON.stringify({
          entryId,
          value: !value
        })
      })
    } 
    
    catch (error) {

      setNoteItemsState((prevEntries) =>
      prevEntries?.map((entry) =>
        entry.entryId === entryId ? { ...entry, isChecked: !value } : entry
        )
      )
    
      if (sortMethod === "byChecked") {
        setNoteItemsState((prevEntries: Entry[] | undefined) => {
          return prevEntries?.sort((a: Entry, b: Entry) => {
            if (a.isChecked && !b.isChecked) {
              return 1
            }
            else if (!a.isChecked && b.isChecked) {
              return -1
            }
            else {
              return 0
            }
          })
        })
      }

      setOpenError(true)
    }
  }

  const handleChangeView = async (view: string, noteId: string) => {
      
      try {

        setNoteViewSelect(view)
  
        await fetch('/api/change-note-view', {
          method: 'POST',
          body: JSON.stringify({
            noteId,
            view
          })
        })
      } 
      
      catch (error) {
        console.log(error)
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

  const openConfirmRenameItem = (
    entryId: string, 
    currentEntryName: string, 
    currentEntryPriority: string | undefined | null, 
    currentEntryCategory: string | undefined | null
  ) => {
    setSelectedEntryId(entryId)
    setSelectedEntryName(currentEntryName)
    if (currentEntryPriority) {
      setSelectedEntryPriority(currentEntryPriority)
    }
    if (currentEntryCategory) {
      setSelectedEntryCategory(currentEntryCategory)
    }
    setOpenRenameNoteItemPopup(true)
  }

  const sortByNewToOld = () => {
    if (sortMethod !== "newToOld") {
      setSortMethod("newToOld")
      setNoteItemsState((prevEntries: Entry[] | undefined) => {
        return prevEntries?.sort((a: Entry, b: Entry) => b.createdAt - a.createdAt)
      })
    }
  }

  const sortByOldToNew = () => {
    if (sortMethod !== "oldToNew") {
      setSortMethod("oldToNew")
      setNoteItemsState((prevEntries: Entry[] | undefined) => {
        return prevEntries?.sort((a: Entry, b: Entry) => a.createdAt - b.createdAt)
      })
    }
  }

  const sortByPriority = () => {
    if (sortMethod !== "byPriority") {
      setSortMethod("byPriority")
      setNoteItemsState((prevEntries: Entry[] | undefined) => {
        const priorityOrder = ["red", "yellow", "green", "none", null] as 
        (string | null | undefined)[]
        
        return prevEntries?.sort((a: Entry, b: Entry) => {
          
            const priorityA = priorityOrder.indexOf(a?.priority)
            const priorityB = priorityOrder.indexOf(b?.priority)

            return priorityA - priorityB
        })
      })
    }
  }

  const sortByName = () => {
    if (sortMethod !== "byName") {
      setSortMethod("byName")
      setNoteItemsState((prevEntries: Entry[] | undefined) => {
        return prevEntries?.sort((a: Entry, b: Entry) => a.item.localeCompare(b.item))
      })
    }
  }

  const sortByChecked = () => {
    if (sortMethod !== "byChecked") {
      setSortMethod("byChecked")
      setNoteItemsState((prevEntries: Entry[] | undefined) => {
        return prevEntries?.sort((a: Entry, b: Entry) => {
          if (a.isChecked && !b.isChecked) {
            return 1
          }
          else if (!a.isChecked && b.isChecked) {
            return -1
          }
          else {
            return 0
          }
        })
      })
    }
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
      
        {/* items counter  */}
        <h5 style={{marginBottom: "2em", alignSelf: "flex-start", fontSize: "0.75rem"}}>
            {noteItemsState?.length === 1 ? 
            `1 Item` : 
            `${noteItemsState?.length} Items - ${ChecksCount} Checked ● ${UnCheckedCount} Unchecked`}
        </h5>

        {/* list tool bar add items and sort  */}
        <div style={{display: "flex", justifyContent: "space-between", width: "100%"}}>
          <div 
            onClick={() => setOpenAddItemPopup(true)} 
            className={styles.addItemToNote}
            ref={addItemButtonRef}
          >
              <FaPlus />
              <p>Add Item</p>
          </div>
          
          <div style={{display: "flex", alignItems: "center", gap: "0.5em"}}>
            <SwitchNoteViewBtn 
              changeNoteView={(view: string) => handleChangeView(view, noteId)}
              currentNoteView={noteViewSelect}
            />

            <SortingMenu
              sortMethod={sortMethod}
              sortByNewToOld={sortByNewToOld}
              sortByOldToNew={sortByOldToNew}
              sortByPriority={sortByPriority}
              sortByChecked={sortByChecked}
              sortByName={sortByName}
            />
          </div>
        </div>

        {/* search input */}
        <div style={{display: "flex", width: "100%", position: "relative"}}>
          <input 
            onChange={handleSearchInputChange}         
            className={styles.searchInput} 
            placeholder="Search items..."
            value={searchTerm}
          />
          <div className={styles.searchIconContainer}>
            <AiOutlineSearch className={`${styles.searchIcon} ${searchTerm && styles.searchIconColor}`} />
          </div>

          {
            searchTerm ? 
            <MdOutlineCancel onClick={() => setSearchTerm("")} className={styles.deleteSearchBtn} /> : 
            null
          }
        </div>

        {/* floating add item button when scrolling down */}
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

        {/* list of note items mapping */}
        {noteViewSelect === "regular" ?
          noteItemsState?.filter(entry => {
            if (searchTerm === "") {
              return entry
            }
            else if (entry.item.toLowerCase().includes(searchTerm.toLowerCase())) {
              return entry
            }
          })?.length === 0 ? 

          <p style={{marginTop: "2em"}}>No Results...</p> :
          
          <List 
            className={styles.noteListContainer} 
            sx={
              { 
                width: '100%', 
                borderRadius: "12px", 
                boxShadow: "0px 2px 18px 3px rgba(0, 0, 0, 0.2)", 
                padding: 0
              }
            }
          >
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
              <AnimatePresence key={entry.entryId}>
                <MotionWrap
                  initial={{opacity: 0, x: 20}}
                  animate={{opacity: 1, x: 0}}
                  exit={{opacity: 0, x: 20}}
                  transition={{duration: 0.3, type: "spring", stiffness: 100, damping: 20}}
                  key={entry.entryId}
                >
                  <ListItem
                    key={entry.entryId}
                    className={
                      `${index === 0 ? 
                        styles.firstItem : 
                        index === noteItemsState.length - 1 ? 
                        styles.lastItem : ''
                      } 
                      ${index % 2 === 0 ? 
                        styles.noteListItem : 
                        styles.noteListItemOdd
                      }`
                    }
                    disablePadding
                    secondaryAction={
                        <div style={{display: "flex", gap: "1em"}}>
                        <IconButton 
                          onClick={() => openConfirmRenameItem(entry.entryId, entry.item, entry?.priority, entry?.category)} 
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
                      {/* list item checkbox section  */}
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
                </MotionWrap>
              </AnimatePresence>
            )
          })
          }
        </List> : 
        
        // categories view if chosen
        noteItemsState?.reduce((result: GroupedData[], item) => {
          const category: string = item.category || "no category";
          const existingCategory: GroupedData | undefined = result.find(obj => obj.category === category);
        
          if (existingCategory) {
            existingCategory.data.push(item);
          } else {
            result.push({ category, data: [item] });
          }
        
            return result;
          }, [])
          .map((group) => (
          <AnimatePresence key={group.category}>
            <MotionWrap
              initial={{opacity: 0, x: 20}}
              animate={{opacity: 1, x: 0}}
              style={{width: "100%"}}
              exit={{opacity: 0, x: 20}}
              transition={{duration: 0.3, type: "spring", stiffness: 100, damping: 20}}
              key={group.category}
            >
            <Accordion 
              className={styles.accordionContainer}
              expanded={expendedCategory?.includes(group.category)}
              onChange={() => setExpendedCategory(prevState => {
                if (prevState?.includes(group.category)) {
                  return prevState.filter(category => category !== group.category)
                }
                else {
                  return [...prevState! , group.category]
                }
              })}
            >
              <AccordionSummary
                expandIcon={<BsChevronDown className={styles.expandIcon} />}
                aria-controls="panel1a-content"
                id="panel1a-header"
              > 
                <div style={{display: "flex", flexDirection: "column", gap: "0.5em"}}>
                  <p>{group.category === "none" || group.category === undefined ? "No Category" : group.category}</p>
                  {group?.data?.length === 1 ? 
                    <p style={{fontSize: "0.75rem", color: "gray"}}>
                      1 Item - {`${group.data?.filter(entry => entry.isChecked).length}/${group?.data?.length}`}
                    </p> :
                    <p style={{fontSize: "0.75rem", color: "gray"}}>
                      {group?.data?.length} Items - {`${group.data?.filter(entry => entry.isChecked).length}/${group?.data?.length}`}
                    </p>
                  }
                </div>
              </AccordionSummary>
              <AccordionDetails sx={{padding: 0}}>
                {group?.data?.filter(entry => {
                    if (searchTerm === "") {
                      return entry
                    }
                    else if (entry.item.toLowerCase().includes(searchTerm.toLowerCase())) {
                      return entry
                    }
                  })?.length === 0 ? 

                  <p style={{marginTop: "2em", marginBottom: "1em", textAlign: "center"}}>No Results...</p> :
                  
                  <List 
                    className={styles.noteListContainer} 
                    sx={
                      { 
                        width: '100%', 
                        padding: 0
                      }
                    }
                  >
                  {group?.data?.filter(entry => {
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
                      <AnimatePresence key={entry.entryId}>
                        <MotionWrap
                          initial={{opacity: 0, x: 20}}
                          animate={{opacity: 1, x: 0}}
                          exit={{opacity: 0, x: 20}}
                          transition={{duration: 0.3, type: "spring", stiffness: 100, damping: 20}}
                          key={entry.entryId}
                        >
                          <ListItem
                            key={entry.entryId}
                            style={{borderRadius: "unset"}}
                            className={
                              `${index === 0 ? 
                                styles.firstItem : 
                                index === group?.data.length - 1 ? 
                                styles.lastItem : ''
                              } 
                              ${index % 2 === 0 ? 
                                styles.noteListItem : 
                                styles.noteListItemOdd
                              }`
                            }
                            disablePadding
                            secondaryAction={
                                <div style={{display: "flex", gap: "1em"}}>
                                <IconButton 
                                  onClick={() => openConfirmRenameItem(entry.entryId, entry.item, entry?.priority, entry?.category)} 
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
                              {/* list item checkbox section  */}
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
                        </MotionWrap>
                      </AnimatePresence>
                    )
                  })
                  }
                </List>}
              </AccordionDetails>
            </Accordion> 
          </MotionWrap>
          </AnimatePresence>
        ))
        
        }
      </>}

      {openAddItemPopup &&
        <AddNoteItemPopup
          isOpen={openAddItemPopup}
          setIsOpen={() => setOpenAddItemPopup(false)}
          noteId={noteId}
          onAdd={(newEntry: Entry) => {
            setNoteItemsState((prevEntries) => [newEntry, ...prevEntries ?? []])

            if (sortMethod === "oldToNew") {
              setNoteItemsState((prevEntries: Entry[] | undefined) => {
                return prevEntries?.sort((a: Entry, b: Entry) => a.createdAt - b.createdAt)
              })
            }

            else if (sortMethod === "byPriority") {
              setNoteItemsState((prevEntries: Entry[] | undefined) => {
                const priorityOrder = ["red", "yellow", "green", "none", null] as 
                (string | null | undefined)[]
                
                return prevEntries?.sort((a: Entry, b: Entry) => {
                  
                    const priorityA = priorityOrder.indexOf(a?.priority)
                    const priorityB = priorityOrder.indexOf(b?.priority)

                    return priorityA - priorityB
                })
              })
            }

            else if (sortMethod === "byName") {
              setNoteItemsState((prevEntries: Entry[] | undefined) => {
                return prevEntries?.sort((a: Entry, b: Entry) => a.item.localeCompare(b.item))
              })
            }
          }}
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
            setSelectedEntryPriority("")
            setSelectedEntryCategory("")
          }}
          entryId={selectedEntryId}
          currentName={selectedEntryName}
          currentPriority={selectedEntryPriority}
          currentCategory={selectedEntryCategory}
          onRename={(isRenamed: boolean, newName: string) => {
            if (isRenamed) {
              setNoteItemsState((prevEntries) =>
                prevEntries?.map((entry) =>
                  entry.entryId === selectedEntryId ? { ...entry, item: newName } : entry
                )
              )

              if (sortMethod === "byName") {
                setNoteItemsState((prevEntries: Entry[] | undefined) => {
                  return prevEntries?.sort((a: Entry, b: Entry) => a.item.localeCompare(b.item))
                })
              }
            }
          }}
          onPriorityChange={(isPriorityChanged: boolean, newPriority: string) => {
            if (isPriorityChanged) {
              setNoteItemsState((prevEntries) =>
                prevEntries?.map((entry) =>
                  entry.entryId === selectedEntryId ? { ...entry, priority: newPriority } : entry
                )
              )

              if (sortMethod === "byPriority") {
                setNoteItemsState((prevEntries: Entry[] | undefined) => {
                  const priorityOrder = ["red", "yellow", "green", "none", null] as 
                  (string | null | undefined)[]
                  
                  return prevEntries?.sort((a: Entry, b: Entry) => {
                    
                      const priorityA = priorityOrder.indexOf(a?.priority)
                      const priorityB = priorityOrder.indexOf(b?.priority)

                      return priorityA - priorityB
                  })
                })
              }
            }
          }}
          onCategoryChange={(isCategoryChanged: boolean, newCategory: string) => {
            if (isCategoryChanged) {
              setNoteItemsState((prevEntries) =>
                prevEntries?.map((entry) =>
                  entry.entryId === selectedEntryId ? { ...entry, category: newCategory } : entry
                )
              )
            }
          }}
          onError={() => {
            setOpenRenameItemError(true)
          }}
          onSetPriorityError={() => {
            setOpenSetPriorityError(true)
          }}
          onSetCategoryError={() => {
            setOpenSetCategoryError(true)
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

      {openSetPriorityError && 
        <Snackbar
          open={openSetPriorityError}
          autoHideDuration={2500}
          onClose={() => setOpenSetPriorityError(false)}
          anchorOrigin={{horizontal: "center", vertical: "bottom"}}
        >
          <Alert onClose={() => setOpenSetPriorityError(false)} severity="error" sx={{ width: '100%' }}>
              Error setting note item priority!
          </Alert>
        </Snackbar>
      }

      {openSetCategoryError &&
        <Snackbar
          open={openSetCategoryError}
          autoHideDuration={2500}
          onClose={() => setOpenSetCategoryError(false)}
          anchorOrigin={{horizontal: "center", vertical: "bottom"}}
        >
          <Alert onClose={() => setOpenSetCategoryError(false)} severity="error" sx={{ width: '100%' }}>
              Error setting note item category!
          </Alert>
        </Snackbar>
      }
    </>
  )
}