'use client'

import styles from "../../app/my-notes/note/[noteId]/styles/notePage.module.css"
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
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
import { useTheme } from 'next-themes'
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
import CategoriesSelector from "./CategoriesSelector"
import FilterByCheckedSelector from "./FilterByCheckedSelector"
import { ably, clientId } from "@/lib/Ably/Ably"
import FlipNumbers from 'react-flip-numbers'

const AddNoteItemPopup = dynamic(() => import('./AddNoteItemPopup'), {
  loading: () => <Backdrop open={true}><CircularProgress className={styles.backDropLoader} /></Backdrop>
})

const DeleteNoteItemPopup = dynamic(() => import('./DeleteNoteItemPopup'), {
  loading: () => <Backdrop open={true}><CircularProgress className={styles.backDropLoader} /></Backdrop>
})

const RenameNoteItemPopup = dynamic(() => import('./RenameNoteItemPopup'), {
  loading: () => <Backdrop open={true}><CircularProgress className={styles.backDropLoader} /></Backdrop>
})

interface GroupedData {
  category: string
  data: Entry[]
}

// A simple throttle utility to avoid too frequent updates
const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false
  return (...args: Parameters<T>): void => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

export default function NoteItemsList({ noteEntries, noteView, noteId }: { noteEntries: Entry[] | undefined, noteView: string, noteId: string }) {

  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const { scrollY } = useScroll()
  
  // Keep the raw data in state
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
  const [filterByChecked, setFilterByChecked] = useState<string>("All")
  const [filterByCategory, setFilterByCategory] = useState<string>("empty")
  const [sortMethod, setSortMethod] = useState<string>("newToOld")
  const [noteViewSelect, setNoteViewSelect] = useState<string>(noteView)
  const [ChecksCount, SetChecksCount] = useState(noteEntries?.filter(entry => entry.isChecked).length ?? 0)
  const [UnCheckedCount, SetUnCheckedCount] = useState(noteEntries?.filter(entry => !entry.isChecked).length ?? 0)

  // Compute available categories from the initial data
  const itemsCategories = useMemo(() => {
    if (!noteEntries) return []
    return Array.from(
      noteEntries.reduce((categorySet: Set<string>, entry: Entry) => {
        const category = entry.category ?? "No Category"
        categorySet.add(category)
        return categorySet
      }, new Set<string>())
    )
  }, [noteEntries])

  const [allCategories, setAllCategories] = useState(itemsCategories)
  const [expendedCategory, setExpendedCategory] = useState(itemsCategories)

  useEffect(() => {
    setAllCategories(itemsCategories)
  }, [itemsCategories])

  // Separate sorting from filtering by deriving a sorted version from the raw state
  const sortedNoteItems = useMemo(() => {
    if (!noteItemsState) return []
    const sorted = [...noteItemsState]
    switch (sortMethod) {
      case 'newToOld':
        sorted.sort((a, b) => b.createdAt - a.createdAt)
        break
      case 'oldToNew':
        sorted.sort((a, b) => a.createdAt - b.createdAt)
        break
      case 'byPriority': {
        const priorityOrder = ["red", "yellow", "green", "none", null]
        sorted.sort((a, b) => priorityOrder.indexOf(a.priority || "") - priorityOrder.indexOf(b.priority || ""))
        break
      }
      case 'byName':
        sorted.sort((a, b) => a.item.localeCompare(b.item))
        break
      case 'byChecked':
        sorted.sort((a, b) => {
          if (a.isChecked && !b.isChecked) return 1
          if (!a.isChecked && b.isChecked) return -1
          return 0
        })
        break
      default:
        break
    }
    return sorted
  }, [noteItemsState, sortMethod])

  // Apply filtering on top of the sorted list
  const filteredNoteItems = useMemo(() => {
    const searchTermLower = searchTerm.trim().toLowerCase()
    return sortedNoteItems.filter(entry => {
      const matchesSearch = searchTermLower === '' || entry.item.toLowerCase().includes(searchTermLower)
      const matchesChecked = filterByChecked === 'All' ||
        (filterByChecked === 'checked' && entry.isChecked) ||
        (filterByChecked === 'unchecked' && !entry.isChecked)
      const matchesCategory = filterByCategory === 'empty' || entry.category === filterByCategory
      return matchesSearch && matchesChecked && matchesCategory
    })
  }, [sortedNoteItems, searchTerm, filterByChecked, filterByCategory])

  // Group filtered items for categories view
  const groupedNoteItems = useMemo(() => {
    return filteredNoteItems.reduce((groups: GroupedData[], item) => {
      const category = !item.category || item.category === 'none' ? 'No Category' : item.category
      const existingGroup = groups.find(group => group.category === category)
      if (existingGroup) {
        existingGroup.data.push(item)
      }
      else {
        groups.push({ category, data: [item] })
      }
      return groups
    }, [])
  }, [filteredNoteItems])

  const addItemButtonRef = useRef<HTMLDivElement>(null)

  // Throttled scroll handler to update button visibility
  const handleScroll = useCallback(() => {
    throttle(() => {
      const addItemButton = addItemButtonRef.current
      if (addItemButton) {
        const { top, bottom } = addItemButton.getBoundingClientRect()
        const isElementVisible = top < window.innerHeight && bottom >= 0
        if (!isElementVisible && isButtonVisible) {
          setIsButtonVisible(false)
        }
        else if (isElementVisible && !isButtonVisible) {
          setIsButtonVisible(true)
        }
      }
    }, 100)()
  }, [isButtonVisible])

  useEffect(() => {
    scrollY.on("change", handleScroll)
    return () => {
      scrollY.clearListeners()
    }
  }, [scrollY, handleScroll])

  // Update checked/unchecked counts
  useEffect(() => {
    let checkedItemsCount = 0
    let uncheckedItemsCount = 0
    filteredNoteItems?.forEach(entry => {
      if (entry.isChecked) {
        checkedItemsCount += 1
      }
      else {
        uncheckedItemsCount += 1
      }
    })
    SetChecksCount(checkedItemsCount)
    SetUnCheckedCount(uncheckedItemsCount)
  }, [filteredNoteItems])

  // Handlers wrapped with useCallback
  const handleToggle = useCallback(async (value: boolean | null | undefined, entryId: string) => {
    setNoteItemsState(prevEntries =>
      prevEntries?.map(entry =>
        entry.entryId === entryId ? { ...entry, isChecked: !value } : entry
      )
    )
    try {
      await fetch('/api/change-note-item-is-checked', {
        method: 'POST',
        body: JSON.stringify({
          clientId,
          noteId,
          entryId,
          value: !value
        })
      })
    }
    catch (error) {
      setNoteItemsState(prevEntries =>
        prevEntries?.map(entry =>
          entry.entryId === entryId ? { ...entry, isChecked: !value } : entry
        )
      )
      setOpenError(true)
    }
  }, [noteId])

  const handleChangeView = useCallback(async (view: string, noteId: string) => {
    setNoteViewSelect(view)
    try {
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
  }, [])

  const handleSearchInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }, [])

  const handleAddNoteItem = useCallback((newEntry: Entry) => {
    setNoteItemsState(prevEntries => [newEntry, ...prevEntries ?? []])
    router.refresh()
  }, [router])

  const openConfirmDeleteItem = useCallback((entryId: string, entryName: string) => {
    setSelectedEntryId(entryId)
    setSelectedEntryName(entryName)
    setOpenDeleteNoteItemPopup(true)
  }, [])

  const openConfirmRenameItem = useCallback((entryId: string, currentEntryName: string, currentEntryPriority: string | undefined | null, currentEntryCategory: string | undefined | null) => {
    setSelectedEntryId(entryId)
    setSelectedEntryName(currentEntryName)
    if (currentEntryPriority) {
      setSelectedEntryPriority(currentEntryPriority)
    }
    if (currentEntryCategory) {
      setSelectedEntryCategory(currentEntryCategory)
    }
    setOpenRenameNoteItemPopup(true)
  }, [])

  // Sorting functions simply update sortMethod
  const sortByNewToOld = useCallback(() => {
    if (sortMethod !== "newToOld") {
      setSortMethod("newToOld")
    }
  }, [sortMethod])

  const sortByOldToNew = useCallback(() => {
    if (sortMethod !== "oldToNew") {
      setSortMethod("oldToNew")
    }
  }, [sortMethod])

  const sortByPriority = useCallback(() => {
    if (sortMethod !== "byPriority") {
      setSortMethod("byPriority")
    }
  }, [sortMethod])

  const sortByName = useCallback(() => {
    if (sortMethod !== "byName") {
      setSortMethod("byName")
    }
  }, [sortMethod])

  const sortByChecked = useCallback(() => {
    if (sortMethod !== "byChecked") {
      setSortMethod("byChecked")
    }
  }, [sortMethod])

  // Subscribe to Ably channel for real-time updates
  useEffect(() => {
    const channel = ably.channels.get(`note-${noteId}`)

    channel.subscribe('note-created', message => {
      // Ignore message if it originated from this client
      if (message.data.sender === clientId) return

      const createdEntry = message.data.createdEntry
      const updatedEntry = {
        ...createdEntry,
        createdAt: new Date(createdEntry.createdAt)
      }

      handleAddNoteItem(updatedEntry)
    })

    channel.subscribe('note-item-toggle-checked', message => {
      // Ignore message if it originated from this client
      if (message.data.sender === clientId) return

      const toggledEntryId = message.data.entryId
      setNoteItemsState(prevEntries =>
        prevEntries?.map(entry =>
          entry.entryId === toggledEntryId ? { ...entry, isChecked: !entry.isChecked } : entry
        )
      )
    })

    channel.subscribe('note-item-deleted', message => {
      // Ignore message if it originated from this client
      if (message.data.sender === clientId) return

      const deletedEntryId = message.data.entryId
      setNoteItemsState(prevEntries => {
        if (noteItemsState?.length === 1) {
          router.refresh()
        }
        else {
          return prevEntries?.filter(entry => entry.entryId !== deletedEntryId)
        }
      })
      router.refresh()
    })

    channel.subscribe('note-item-renamed', message => {
      // Ignore message if it originated from this client
      if (message.data.sender === clientId) return

      const renamedEntryId = message.data.entryId
      const newName = message.data.newName

      setNoteItemsState(prevEntries =>
        prevEntries?.map(entry =>
          entry.entryId === renamedEntryId ? { ...entry, item: newName } : entry
        )
      )
      router.refresh()
    })

    return () => {
      channel.unsubscribe('note-created')
      channel.unsubscribe('note-item-toggle-checked')
      channel.unsubscribe('note-item-deleted')
      channel.unsubscribe('note-item-renamed')
    }
  }, [noteId, handleAddNoteItem, router, noteItemsState?.length])

  return (
    <>
      {noteEntries && noteEntries.length < 1 ? (
        <div className={styles.noNoteItemsContainer}>
          <NoNoteItemsDrawing />
          <h3>No items in this note...</h3>
          <div onClick={() => setOpenAddItemPopupEmpty(true)} className={styles.addItemToNoteEmptyNotes}>
            <FaPlus />
            <p>Add Item</p>
          </div>
          {openAddItemPopupEmpty && (
            <AddNoteItemPopup
              isOpen={openAddItemPopupEmpty}
              setIsOpen={() => setOpenAddItemPopupEmpty(false)}
              clientId={clientId}
              noteId={noteId}
              onAdd={(newEntry: Entry) => {
                setNoteItemsState(prevEntries => [...prevEntries ?? [], newEntry])
                router.refresh()
              }}
              onError={() => setOpenAddItemError(true)}
            />
          )}
        </div>
      ) : (
        <>
          {/* Items counter */}
          <h5 
            style={{ 
              marginBottom: '2em', 
              alignSelf: 'flex-start', 
              fontSize: '0.75rem', 
              lineHeight: '1.2', 
              display: "flex", 
              gap: "0.35em" 
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle', paddingLeft: (filteredNoteItems?.length || 0) === 0 ? '2px' : '0' }}>
              <FlipNumbers
                key={`flip-${resolvedTheme}`}
                height={13.5}
                width={8.5}
                numbers={filteredNoteItems?.length.toString()}
                play
                perspective={100}
                color={resolvedTheme === 'dark' ? 'white' : 'black'}
              />
            </span>
            <span style={{paddingTop: "0.1em"}}>{filteredNoteItems?.length === 1 ? 'Item' : 'Items'} -</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle', paddingLeft: ChecksCount === 0 ? '2px' : '0' }}>
              <FlipNumbers
                key={`flip-${resolvedTheme}`}
                height={13.5}
                width={8.5}
                numbers={ChecksCount.toString()}
                play
                perspective={100}
                color={resolvedTheme === 'dark' ? 'white' : 'black'}
              />
            </span>
            <span style={{ paddingTop: "0.1em" }}>Checked ●</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle', paddingLeft: UnCheckedCount === 0 ? '2px' : '0' }}>
              <FlipNumbers
                key={`flip-${resolvedTheme}`}
                height={13.5}
                width={8.5}
                numbers={UnCheckedCount.toString()}
                play
                perspective={100}
                color={resolvedTheme === 'dark' ? 'white' : 'black'}
              />
            </span>
            <span style={{ paddingTop: "0.1em" }}>Unchecked</span>
          </h5>

          {/* Toolbar: add items, sort, etc. */}
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
            <div onClick={() => setOpenAddItemPopup(true)} className={styles.addItemToNote} ref={addItemButtonRef}>
              <FaPlus />
              <p>Add Item</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5em" }}>
              <SwitchNoteViewBtn changeNoteView={(view: string) => handleChangeView(view, noteId)} currentNoteView={noteViewSelect} />
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

          {/* Search input */}
          <div style={{ display: "flex", width: "100%", position: "relative" }}>
            <input onChange={handleSearchInputChange} className={styles.searchInput} placeholder="Search items..." value={searchTerm} />
            <div className={styles.searchIconContainer}>
              <AiOutlineSearch className={`${styles.searchIcon} ${searchTerm && styles.searchIconColor}`} />
            </div>
            {searchTerm && <MdOutlineCancel onClick={() => setSearchTerm("")} className={styles.deleteSearchBtn} />}
          </div>

          {/* Filter selectors */}
          <FilterByCheckedSelector filterByChecked={(filter: string) => setFilterByChecked(filter)} />
          {noteViewSelect === "categories" && (
            <CategoriesSelector 
              availableCategories={allCategories} 
              filterByCategory={(category: string) => setFilterByCategory(category)} 
            />
          )}

          {/* Floating add item button when scrolling down */}
          <AnimatePresence>
            {!isButtonVisible && (
              <MotionWrap
                className={styles.addItemToNotePopupSticky}
                onClick={() => setOpenAddItemPopup(true)}
                initial={{ scale: 0.5, y: 100 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.5, y: 100 }}
                transition={{ duration: 0.5, type: "spring", bounce: 0.25 }}
              >
                <FaPlus />
              </MotionWrap>
            )}
          </AnimatePresence>

          {/* Render items */}
          {noteViewSelect === "regular" ? (
            filteredNoteItems.length === 0 ? (
              <p style={{ marginTop: "7em" }}>No Results...</p>
            ) : (
              <List className={styles.noteListContainer} sx={{ width: '100%', borderRadius: "12px", boxShadow: "0px 2px 18px 3px rgba(0, 0, 0, 0.2)", padding: 0 }}>
                {filteredNoteItems.map((entry, index) => {
                  const labelId = `checkbox-list-label-${entry.entryId}`
                  const entryPriority = entry.priority
                  return (
                    <AnimatePresence key={entry.entryId}>
                      <MotionWrap initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3, type: "spring", stiffness: 100, damping: 20 }} key={entry.entryId}>
                        <ListItem
                          key={entry.entryId}
                          className={`${index === 0 ? styles.firstItem : index === filteredNoteItems.length - 1 ? styles.lastItem : ''} ${index % 2 === 0 ? styles.noteListItem : styles.noteListItemOdd}`}
                          disablePadding
                          secondaryAction={
                            <div style={{ display: "flex", gap: "1em" }}>
                              <IconButton onClick={() => openConfirmRenameItem(entry.entryId, entry.item, entry?.priority, entry?.category)} className={styles.iconButtonRename} edge="end" aria-label="edit">
                                <MdModeEditOutline className={styles.iconRename} />
                              </IconButton>
                              <IconButton onClick={() => openConfirmDeleteItem(entry.entryId, entry.item)} className={styles.iconButtonDelete} edge="end" aria-label="delete">
                                <MdDelete className={styles.iconDelete} />
                              </IconButton>
                            </div>
                          }
                        >
                          <ListItemButton onClick={() => handleToggle(entry?.isChecked, entry.entryId)} dense>
                            <ListItemIcon sx={{ minWidth: "2em" }}>
                              <Checkbox className={styles.noteListCheckbox} edge="start" checked={entry?.isChecked ?? false} tabIndex={-1} disableRipple inputProps={{ 'aria-labelledby': labelId }} />
                            </ListItemIcon>
                            <div>
                              <ListItemText
                                className={styles.noteListItemText}
                                sx={{ textDecoration: entry?.isChecked ? "line-through" : "none", paddingRight: "3em", lineBreak: "anywhere" }}
                                id={labelId}
                                primary={entry.item}
                              />
                              <div style={{ display: "flex" }}>
                                <ListItemText className={styles.itemCreatedAt}>
                                  {formatDate(entry.createdAt)}
                                </ListItemText>
                                {entry.priority && entryPriority === "green" ? (
                                  <div className={styles.priorityColorGreen} />
                                ) : entryPriority === "yellow" ? (
                                  <div className={styles.priorityColorYellow} />
                                ) : entryPriority === "red" ? (
                                  <div className={styles.priorityColorRed} />
                                ) : null}
                              </div>
                            </div>
                          </ListItemButton>
                        </ListItem>
                      </MotionWrap>
                    </AnimatePresence>
                  )
                })}
              </List>
            )
          ) : // Categories view
          filteredNoteItems.length === 0 ? (
            <p style={{ marginTop: "7em", marginBottom: "1em", textAlign: "center" }}>No Results...</p>
          ) : (
            groupedNoteItems.map(group => (
              <AnimatePresence key={group.category}>
                <MotionWrap initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ width: "100%" }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3, type: "spring", stiffness: 100, damping: 20 }} key={group.category}>
                  <Accordion
                    className={styles.accordionContainer}
                    expanded={expendedCategory?.includes(group.category)}
                    onChange={() => setExpendedCategory(prevState => {
                      if (prevState?.includes(group.category)) {
                        return prevState.filter(category => category !== group.category)
                      }
                      else {
                        return [...prevState, group.category]
                      }
                    })}
                  >
                    <AccordionSummary expandIcon={<BsChevronDown className={styles.expandIcon} />} aria-controls="panel1a-content" id="panel1a-header">
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5em" }}>
                        <p>{group.category === "none" || group.category === null ? "No category" : group.category}</p>
                        {group.data.length === 1 ? (
                          <p style={{ fontSize: "0.75rem", color: "gray" }}>
                            1 Item - {`${group.data.filter(entry => entry.isChecked).length}/${group.data.length}`}
                          </p>
                        ) : (
                          <p style={{ fontSize: "0.75rem", color: "gray" }}>
                            {group.data.length} Items - {`${group.data.filter(entry => entry.isChecked).length}/${group.data.length}`}
                          </p>
                        )}
                      </div>
                    </AccordionSummary>
                    <AccordionDetails sx={{ padding: 0 }}>
                      <List className={styles.noteListContainer} sx={{ width: '100%', padding: 0 }}>
                        {group.data.map((entry, index) => {
                          const labelId = `checkbox-list-label-${entry.entryId}`
                          const entryPriority = entry.priority
                          return (
                            <AnimatePresence key={entry.entryId}>
                              <MotionWrap initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3, type: "spring", stiffness: 100, damping: 20 }} key={entry.entryId}>
                                <ListItem
                                  key={entry.entryId}
                                  style={{ borderRadius: "unset" }}
                                  className={`${index === 0 ? styles.firstItem : index === group.data.length - 1 ? styles.lastItem : ''} ${index % 2 === 0 ? styles.noteListItem : styles.noteListItemOdd}`}
                                  disablePadding
                                  secondaryAction={
                                    <div style={{ display: "flex", gap: "1em" }}>
                                      <IconButton onClick={() => openConfirmRenameItem(entry.entryId, entry.item, entry?.priority, entry?.category)} className={styles.iconButtonRename} edge="end" aria-label="edit">
                                        <MdModeEditOutline className={styles.iconRename} />
                                      </IconButton>
                                      <IconButton onClick={() => openConfirmDeleteItem(entry.entryId, entry.item)} className={styles.iconButtonDelete} edge="end" aria-label="delete">
                                        <MdDelete className={styles.iconDelete} />
                                      </IconButton>
                                    </div>
                                  }
                                >
                                  <ListItemButton onClick={() => handleToggle(entry?.isChecked, entry.entryId)} dense>
                                    <ListItemIcon sx={{ minWidth: "2em" }}>
                                      <Checkbox className={styles.noteListCheckbox} edge="start" checked={entry?.isChecked ?? false} tabIndex={-1} disableRipple inputProps={{ 'aria-labelledby': labelId }} />
                                    </ListItemIcon>
                                    <div>
                                      <ListItemText
                                        className={styles.noteListItemText}
                                        sx={{ textDecoration: entry?.isChecked ? "line-through" : "none", paddingRight: "3em", lineBreak: "anywhere" }}
                                        id={labelId}
                                        primary={entry.item}
                                      />
                                      <div style={{ display: "flex" }}>
                                        <ListItemText className={styles.itemCreatedAt}>
                                          {formatDate(entry.createdAt)}
                                        </ListItemText>
                                        {entry.priority && entryPriority === "green" ? (
                                          <div className={styles.priorityColorGreen} />
                                        ) : entryPriority === "yellow" ? (
                                          <div className={styles.priorityColorYellow} />
                                        ) : entryPriority === "red" ? (
                                          <div className={styles.priorityColorRed} />
                                        ) : null}
                                      </div>
                                    </div>
                                  </ListItemButton>
                                </ListItem>
                              </MotionWrap>
                            </AnimatePresence>
                          )
                        })}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                </MotionWrap>
              </AnimatePresence>
            ))
          )}
        </>
      )}

      {openAddItemPopup && (
        <AddNoteItemPopup
          isOpen={openAddItemPopup}
          setIsOpen={() => setOpenAddItemPopup(false)}
          clientId={clientId}
          noteId={noteId}
          onAdd={(newEntry: Entry) => handleAddNoteItem(newEntry)}
          onError={() => setOpenAddItemError(true)}
        />
      )}
      
      {openDeleteNoteItemPopup && (
        <DeleteNoteItemPopup
          isOpen={openDeleteNoteItemPopup}
          setIsOpen={() => {
            setOpenDeleteNoteItemPopup(false)
            setSelectedEntryId("")
            setSelectedEntryName("")
          }}
          clientId={clientId}
          noteId={noteId}
          entryId={selectedEntryId}
          entryName={selectedEntryName}
          OnDelete={(isDeleted: boolean) => {
            setNoteItemsState(prevEntries => {
              if (isDeleted) {
                if (noteItemsState?.length === 1) {
                  router.refresh()
                }
                else {
                  return prevEntries?.filter(entry => entry.entryId !== selectedEntryId)
                }
              }
            })
            router.refresh()
          }}
          onError={() => setOpenDeleteItemError(true)}
        />
      )}

      {openRenameNoteItemPopup && (
        <RenameNoteItemPopup
          isOpen={openRenameNoteItemPopup}
          setIsOpen={() => {
            setOpenRenameNoteItemPopup(false)
            setSelectedEntryId("")
            setSelectedEntryName("")
            setSelectedEntryPriority("")
            setSelectedEntryCategory("")
          }}
          clientId={clientId}
          noteId={noteId}
          entryId={selectedEntryId}
          currentName={selectedEntryName}
          currentPriority={selectedEntryPriority}
          currentCategory={selectedEntryCategory}
          onRename={(isRenamed: boolean, newName: string) => {
            if (isRenamed) {
              setNoteItemsState(prevEntries =>
                prevEntries?.map(entry =>
                  entry.entryId === selectedEntryId ? { ...entry, item: newName } : entry
                )
              )
              router.refresh()
            }
          }}
          onPriorityChange={(isPriorityChanged: boolean, newPriority: string) => {
            if (isPriorityChanged) {
              setNoteItemsState(prevEntries =>
                prevEntries?.map(entry =>
                  entry.entryId === selectedEntryId ? { ...entry, priority: newPriority } : entry
                )
              )
              router.refresh()
            }
          }}
          onCategoryChange={(isCategoryChanged: boolean, newCategory: string) => {
            if (isCategoryChanged) {
              setNoteItemsState(prevEntries =>
                prevEntries?.map(entry =>
                  entry.entryId === selectedEntryId ? { ...entry, category: newCategory } : entry
                )
              )
              router.refresh()
            }
          }}
          onError={() => setOpenRenameItemError(true)}
          onSetPriorityError={() => setOpenSetPriorityError(true)}
          onSetCategoryError={() => setOpenSetCategoryError(true)}
        />
      )}

      {openError && (
        <Snackbar open={openError} autoHideDuration={2500} onClose={() => setOpenError(false)} anchorOrigin={{ horizontal: "center", vertical: "bottom" }}>
          <Alert onClose={() => setOpenError(false)} severity="error" sx={{ width: '100%' }}>
            Error changing note status!
          </Alert>
        </Snackbar>
      )}

      {openAddItemError && (
        <Snackbar open={openAddItemError} autoHideDuration={2500} onClose={() => setOpenAddItemError(false)} anchorOrigin={{ horizontal: "center", vertical: "bottom" }}>
          <Alert onClose={() => setOpenAddItemError(false)} severity="error" sx={{ width: '100%' }}>
            Error adding new note item!
          </Alert>
        </Snackbar>
      )}

      {openDeleteItemError && (
        <Snackbar open={openDeleteItemError} autoHideDuration={2500} onClose={() => setOpenDeleteItemError(false)} anchorOrigin={{ horizontal: "center", vertical: "bottom" }}>
          <Alert onClose={() => setOpenDeleteItemError(false)} severity="error" sx={{ width: '100%' }}>
            Error deleting note item!
          </Alert>
        </Snackbar>
      )}

      {openRenameItemError && (
        <Snackbar open={openRenameItemError} autoHideDuration={2500} onClose={() => setOpenRenameItemError(false)} anchorOrigin={{ horizontal: "center", vertical: "bottom" }}>
          <Alert onClose={() => setOpenRenameItemError(false)} severity="error" sx={{ width: '100%' }}>
            Error renaming note item!
          </Alert>
        </Snackbar>
      )}

      {openSetPriorityError && (
        <Snackbar open={openSetPriorityError} autoHideDuration={2500} onClose={() => setOpenSetPriorityError(false)} anchorOrigin={{ horizontal: "center", vertical: "bottom" }}>
          <Alert onClose={() => setOpenSetPriorityError(false)} severity="error" sx={{ width: '100%' }}>
            Error setting note item priority!
          </Alert>
        </Snackbar>
      )}

      {openSetCategoryError && (
        <Snackbar open={openSetCategoryError} autoHideDuration={2500} onClose={() => setOpenSetCategoryError(false)} anchorOrigin={{ horizontal: "center", vertical: "bottom" }}>
          <Alert onClose={() => setOpenSetCategoryError(false)} severity="error" sx={{ width: '100%' }}>
            Error setting note item category!
          </Alert>
        </Snackbar>
      )}
    </>
  )
}