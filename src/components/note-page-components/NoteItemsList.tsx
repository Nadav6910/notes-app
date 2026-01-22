'use client'

import styles from "../../app/my-notes/note/[noteId]/styles/notePage.module.css"
import { useState, useEffect, useRef, useMemo, useCallback, useDeferredValue, useTransition } from 'react'
import dynamic from 'next/dynamic'
import {
  List,
  Snackbar,
  Alert,
  Backdrop,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Tooltip,
  LinearProgress,
  Box,
  Typography,
  Button
} from '@mui/material'
import { useRouter } from "next/navigation"
import { useTheme } from 'next-themes'
import { AiOutlineSearch } from 'react-icons/ai'
import { MdOutlineCancel, MdCheckCircle, MdRadioButtonUnchecked, MdUndo } from 'react-icons/md'
import { HiUsers, HiUser } from 'react-icons/hi2'
import NoNoteItemsDrawing from "@/SvgDrawings/NoNoteItemsDrawing"
import { Entry } from "../../../types"
import { FaPlus } from 'react-icons/fa'
import { BsChevronDown, BsListCheck, BsCheckAll } from 'react-icons/bs'
import { useScroll, AnimatePresence } from 'framer-motion'
import MotionWrap from "@/wrappers/MotionWrap"
import SortingMenu from "./SortingMenu"
import SwitchNoteViewBtn from "./SwitchNoteViewBtn"
import CategoriesSelector from "./CategoriesSelector"
import FilterByCheckedSelector from "./FilterByCheckedSelector"
import NoteListItem from "./NoteListItem"
import CategoryListItem from "./CategoryListItem"
import ProgressRing from "./ProgressRing"
import { ably, clientId } from "@/lib/Ably/Ably"
import FlipNumbers from 'react-flip-numbers'
import useChannelOccupancy from '../../app/hooks/useChannelOccupancy'

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

// Deleted item type for undo functionality
interface DeletedItem {
  entry: Entry
  timeoutId: NodeJS.Timeout
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
  const [showUserEntered, setShowUserEntered] = useState<boolean>(false)
  const [showUserLeft, setShowUserLeft] = useState<boolean>(false)

  // ✅ Optimized: Consolidated 6 duplicate error snackbars into single notification system
  type NotificationSeverity = 'error' | 'success' | 'info' | 'warning'
  interface Notification {
    open: boolean
    message: string
    severity: NotificationSeverity
    icon?: React.ReactNode
  }

  const [notification, setNotification] = useState<Notification>({
    open: false,
    message: '',
    severity: 'info'
  })

  const showNotification = useCallback((message: string, severity: NotificationSeverity, icon?: React.ReactNode) => {
    setNotification({ open: true, message, severity, icon })
  }, [])
  const [isButtonVisible, setIsButtonVisible] = useState<boolean>(true)
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [filterByChecked, setFilterByChecked] = useState<string>("All")
  const [filterByCategory, setFilterByCategory] = useState<string>("empty")
  const [sortMethod, setSortMethod] = useState<string>("newToOld")
  const [noteViewSelect, setNoteViewSelect] = useState<string>(noteView)

  // Undo delete state
  const [deletedItem, setDeletedItem] = useState<DeletedItem | null>(null)
  const [showUndoSnackbar, setShowUndoSnackbar] = useState(false)

  // Use deferred values for filters to prevent UI blocking during filtering
  const deferredSearchTerm = useDeferredValue(searchTerm)
  const deferredFilterByChecked = useDeferredValue(filterByChecked)
  const deferredFilterByCategory = useDeferredValue(filterByCategory)

  // Use transition for non-urgent filter updates
  const [isPending, startTransition] = useTransition()

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

  // Apply filtering on top of the sorted list - use deferred values for smoother UX
  const filteredNoteItems = useMemo(() => {
    const searchTermLower = deferredSearchTerm.trim().toLowerCase()
    return sortedNoteItems.filter(entry => {
      const matchesSearch = searchTermLower === '' || entry.item.toLowerCase().includes(searchTermLower)
      const matchesChecked = deferredFilterByChecked === 'All' ||
        (deferredFilterByChecked === 'checked' && entry.isChecked) ||
        (deferredFilterByChecked === 'unchecked' && !entry.isChecked)
      const matchesCategory = deferredFilterByCategory === 'empty' || entry.category === deferredFilterByCategory
      return matchesSearch && matchesChecked && matchesCategory
    })
  }, [sortedNoteItems, deferredSearchTerm, deferredFilterByChecked, deferredFilterByCategory])

  // Calculate counts inline in memo to avoid extra re-render
  const { ChecksCount, UnCheckedCount } = useMemo(() => {
    let checked = 0
    let unchecked = 0
    filteredNoteItems.forEach(entry => {
      if (entry.isChecked) checked++
      else unchecked++
    })
    return { ChecksCount: checked, UnCheckedCount: unchecked }
  }, [filteredNoteItems])

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

  // Compute item counts per category for the selector
  const categoryItemCounts = useMemo(() => {
    if (!noteItemsState) return {}
    return noteItemsState.reduce((counts: Record<string, number>, item) => {
      const category = !item.category || item.category === 'none' ? 'No Category' : item.category
      counts[category] = (counts[category] || 0) + 1
      return counts
    }, {})
  }, [noteItemsState])

  const addItemButtonRef = useRef<HTMLDivElement>(null)

  // Scroll handler to update button visibility
  const handleScrollInner = useCallback(() => {
    const addItemButton = addItemButtonRef.current
    if (!addItemButton) return

    const { top, bottom } = addItemButton.getBoundingClientRect()
    const isElementVisible = top < window.innerHeight && bottom >= 0

    if (!isElementVisible && isButtonVisible) {
      setIsButtonVisible(false)
    } else if (isElementVisible && !isButtonVisible) {
      setIsButtonVisible(true)
    }
  }, [isButtonVisible])

  // Create throttled version once - memoized to prevent recreation
  const throttledScrollHandler = useMemo(
    () => throttle(handleScrollInner, 100),
    [handleScrollInner]
  )

  useEffect(() => {
    scrollY.on("change", throttledScrollHandler)

    return () => {
      scrollY.clearListeners()
    }
  }, [scrollY, throttledScrollHandler])


  // Handlers wrapped with useCallback
  const handleToggle = useCallback(async (value: boolean | null | undefined, entryId: string, category?: string) => {
    const newValue = !value
    
    // Optimistic update
    setNoteItemsState(prevEntries =>
      prevEntries?.map(entry =>
        entry.entryId === entryId ? { ...entry, isChecked: newValue } : entry
      )
    )
    
    try {
      const response = await fetch('/api/change-note-item-is-checked', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          noteId,
          entryId,
          value: newValue
        })
      })
      if (!response.ok) {
        throw new Error('Failed to update')
      }
    }
    catch (error) {
      // Rollback to original value on error
      setNoteItemsState(prevEntries =>
        prevEntries?.map(entry =>
          entry.entryId === entryId ? { ...entry, isChecked: value } : entry
        )
      )
      showNotification('❌ Failed to update item status', 'error')
    }
  }, [noteId, showNotification])

  const handleChangeView = useCallback(async (view: string, noteId: string) => {
    setNoteViewSelect(view)
    try {
      await fetch('/api/change-note-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    const value = e.target.value
    // Use transition for non-urgent search updates
    startTransition(() => {
      setSearchTerm(value)
    })
  }, [])

  // Optimized filter handlers using transitions
  const handleFilterByChecked = useCallback((filter: string) => {
    startTransition(() => {
      setFilterByChecked(filter)
    })
  }, [])

  const handleFilterByCategory = useCallback((category: string) => {
    startTransition(() => {
      setFilterByCategory(category)
    })
  }, [])

  const handleAddNoteItem = useCallback((newEntry: Entry) => {
    setNoteItemsState(prevEntries => [newEntry, ...prevEntries ?? []])
    // Defer the refresh to avoid blocking UI - ensures data persists on navigation
    startTransition(() => {
      router.refresh()
    })
  }, [router])

  // Soft delete with undo capability (for swipe delete)
  const handleSoftDelete = useCallback((entryId: string, entryName: string) => {
    // Find the entry to delete
    const entryToDelete = noteItemsState?.find(entry => entry.entryId === entryId)
    if (!entryToDelete) return

    // Clear any existing undo timeout
    if (deletedItem?.timeoutId) {
      clearTimeout(deletedItem.timeoutId)
    }

    // Remove from UI immediately
    setNoteItemsState(prevEntries => 
      prevEntries?.filter(entry => entry.entryId !== entryId)
    )

    // Set up undo timeout - actually delete after 5 seconds
    const timeoutId = setTimeout(async () => {
      try {
        await fetch('/api/delete-note-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId,
            noteId,
            entryId
          })
        })
        startTransition(() => {
          router.refresh()
        })
      } catch (error) {
        console.error('Failed to delete item:', error)
        // Restore item on error
        setNoteItemsState(prevEntries => [...(prevEntries ?? []), entryToDelete])
        showNotification('❌ Failed to delete item', 'error')
      }
      setDeletedItem(null)
      setShowUndoSnackbar(false)
    }, 5000)

    // Store deleted item for potential undo
    setDeletedItem({ entry: entryToDelete, timeoutId })
    setShowUndoSnackbar(true)
  }, [noteItemsState, deletedItem, noteId, router, showNotification])

  // Undo delete handler - recreates the item
  const handleUndoDelete = useCallback(async () => {
    if (deletedItem) {
      // Clear the timeout
      clearTimeout(deletedItem.timeoutId)
      
      // Store entry data before clearing state
      const entryToRestore = deletedItem.entry
      
      // Clear undo state immediately
      setDeletedItem(null)
      setShowUndoSnackbar(false)
      
      // Recreate the item via API (use correct parameter names)
      try {
        const response = await fetch('/api/create-note-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId,
            noteId,
            itemName: entryToRestore.item,
            selectedPriorityColor: entryToRestore.priority || 'none',
            selectedCategory: entryToRestore.category || 'none'
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          // Use the NEW entry from API response with the correct new ID
          // Prisma returns 'entryId' as the field name (mapped from _id in MongoDB)
          const newEntry: Entry = {
            entryId: data.createdEntry.entryId,
            noteId: data.createdEntry.noteId,
            item: data.createdEntry.item,
            isChecked: data.createdEntry.isChecked,
            priority: data.createdEntry.priority,
            category: data.createdEntry.category,
            createdAt: new Date(data.createdEntry.createdAt)
          }
          // Add the new entry with correct ID to state
          setNoteItemsState(prevEntries => [...(prevEntries ?? []), newEntry])
          showNotification('✅ Item restored', 'success')
          startTransition(() => {
            router.refresh()
          })
        } else {
          const errorData = await response.json()
          console.error('Restore failed:', errorData)
          throw new Error('Failed to restore')
        }
      } catch (error) {
        console.error('Failed to restore item:', error)
        showNotification('❌ Failed to restore item', 'error')
      }
    }
  }, [deletedItem, noteId, router, showNotification])

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

  // Memoize the callback so it doesn't change every render
  const handlePresenceEvent = useCallback((incomingClientId: string, action: string) => {
    if (incomingClientId === clientId) return

    if (action === 'enter') {
      setShowUserEntered(true)
    }
    else if (action === 'leave') {
      setShowUserLeft(true)
    }
  }, [])
  
  const occupancy = useChannelOccupancy(`note-${noteId}`, handlePresenceEvent)

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
      setNoteItemsState(prevEntries =>
        prevEntries?.filter(entry => entry.entryId !== deletedEntryId)
      )
      // Deferred refresh for data persistence
      startTransition(() => {
        router.refresh()
      })
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
      // Deferred refresh for data persistence
      startTransition(() => {
        router.refresh()
      })
    })

    return () => {
      channel.unsubscribe('note-created')
      channel.unsubscribe('note-item-toggle-checked')
      channel.unsubscribe('note-item-deleted')
      channel.unsubscribe('note-item-renamed')
    }
  }, [noteId, handleAddNoteItem, router]) // ✅ Removed noteItemsState?.length to prevent reconnections on every list change

  return (
    <>
      {noteEntries && noteEntries.length < 1 ? (
        <MotionWrap
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, type: "spring" }}
          className={styles.noNoteItemsContainer}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              p: 4,
              borderRadius: 3,
              bgcolor: 'var(--note-card-background-card-item)',
              border: '1px solid var(--borders-color)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              maxWidth: 400,
              mx: 'auto'
            }}
          >
            <NoNoteItemsDrawing />
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ color: 'var(--primary-color)', fontWeight: 600, mb: 1 }}>
                Your list is empty
              </Typography>
              <Typography variant="body2" sx={{ color: 'var(--primary-color)', opacity: 0.6 }}>
                Start adding items to your shopping list
              </Typography>
            </Box>
            <Tooltip title="Add your first item" arrow placement="bottom">
              <Box
                onClick={() => setOpenAddItemPopupEmpty(true)} 
                className={styles.addItemToNoteEmptyNotes}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  py: 1.5,
                  px: 3,
                  borderRadius: 2,
                  bgcolor: 'var(--secondary-color)',
                  color: '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                  },
                  '&:active': {
                    transform: 'translateY(0)'
                  }
                }}
              >
                <FaPlus style={{ fontSize: '0.9rem' }} />
                <Typography variant="button" sx={{ fontWeight: 600 }}>
                  Add First Item
                </Typography>
              </Box>
            </Tooltip>
          </Box>
          {openAddItemPopupEmpty && (
            <AddNoteItemPopup
              isOpen={openAddItemPopupEmpty}
              setIsOpen={() => setOpenAddItemPopupEmpty(false)}
              clientId={clientId}
              noteId={noteId}
              onAdd={(newEntry: Entry) => {
                setNoteItemsState(prevEntries => [...prevEntries ?? [], newEntry])
                startTransition(() => {
                  router.refresh()
                })
              }}
              onError={() => showNotification('❌ Failed to add item', 'error')}
            />
          )}
        </MotionWrap>
      ) : (
        <>
          {/* Stats Dashboard */}
          <Box 
            sx={{ 
              width: '100%', 
              mb: 2,
              p: 1.5,
              borderRadius: 2,
              bgcolor: 'var(--note-card-background-card-item)',
              border: '1px solid var(--borders-color)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}
          >
            {/* Items count row */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  icon={<BsListCheck style={{ fontSize: '0.9rem' }} />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <span style={{ fontWeight: 600 }}>
                        <FlipNumbers
                          key={`flip-total-${resolvedTheme}`}
                          height={14}
                          width={10}
                          duration={1}
                          numbers={filteredNoteItems?.length.toString()}
                          play
                          perspective={100}
                          color={resolvedTheme === 'dark' ? 'white' : 'black'}
                        />
                      </span>
                      <span>{filteredNoteItems?.length === 1 ? 'Item' : 'Items'}</span>
                    </Box>
                  }
                  size="small"
                  sx={{ 
                    bgcolor: 'var(--secondary-color-faded)',
                    color: 'var(--primary-color)',
                    fontWeight: 500,
                    '& .MuiChip-icon': { color: 'var(--secondary-color)' }
                  }}
                />
                
                <Chip
                  icon={<MdCheckCircle style={{ fontSize: '0.85rem', color: '#4caf50' }} />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <span style={{ fontWeight: 600 }}>
                        <FlipNumbers
                          key={`flip-checked-${resolvedTheme}`}
                          height={14}
                          width={10}
                          duration={1}
                          numbers={ChecksCount.toString()}
                          play
                          perspective={100}
                          color={'#4caf50'}
                        />
                      </span>
                    </Box>
                  }
                  size="small"
                  variant="outlined"
                  sx={{ 
                    borderColor: '#4caf5040',
                    color: '#4caf50',
                    '& .MuiChip-icon': { color: '#4caf50' }
                  }}
                />
                
                <Chip
                  icon={<MdRadioButtonUnchecked style={{ fontSize: '0.85rem', color: 'var(--primary-color)' }} />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <span style={{ fontWeight: 600 }}>
                        <FlipNumbers
                          key={`flip-unchecked-${resolvedTheme}`}
                          height={14}
                          width={10}
                          duration={1}
                          numbers={UnCheckedCount.toString()}
                          play
                          perspective={100}
                          color={resolvedTheme === 'dark' ? '#aaa' : '#666'}
                        />
                      </span>
                    </Box>
                  }
                  size="small"
                  variant="outlined"
                  sx={{ 
                    borderColor: 'var(--borders-color)',
                    color: 'var(--primary-color)',
                    opacity: 0.7,
                    '& .MuiChip-icon': { opacity: 0.7 }
                  }}
                />
              </Box>
              
              {/* Progress indicator - Animated Ring */}
              {filteredNoteItems.length > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <ProgressRing
                    progress={(ChecksCount / filteredNoteItems.length) * 100}
                    size={65}
                    strokeWidth={6}
                    checkedCount={ChecksCount}
                    totalCount={filteredNoteItems.length}
                  />
                </Box>
              )}
            </Box>
            
            {/* Occupancy indicator */}
            <Box 
              sx={{ 
                mt: 1.5, 
                pt: 1.5, 
                borderTop: '1px solid var(--borders-color)',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              {(occupancy === 0 || occupancy === 1) ? (
                <Chip
                  icon={<HiUser style={{ fontSize: '0.85rem' }} />}
                  label="Only you are viewing"
                  size="small"
                  variant="outlined"
                  sx={{ 
                    borderColor: 'var(--borders-color)',
                    color: 'var(--primary-color)',
                    opacity: 0.7,
                    fontSize: '0.75rem'
                  }}
                />
              ) : (
                <Chip
                  icon={<HiUsers style={{ fontSize: '0.85rem' }} />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <span>You +</span>
                      <FlipNumbers
                        key={`flip-occupancy-${resolvedTheme}`}
                        height={12}
                        width={8}
                        duration={1}
                        numbers={(occupancy - 1).toString()}
                        play
                        perspective={100}
                        color={'var(--secondary-color)'}
                      />
                      <span>{occupancy - 1 === 1 ? 'user' : 'users'} viewing</span>
                    </Box>
                  }
                  size="small"
                  sx={{ 
                    bgcolor: 'var(--secondary-color-faded)',
                    color: 'var(--secondary-color)',
                    fontWeight: 500,
                    fontSize: '0.75rem',
                    '& .MuiChip-icon': { color: 'var(--secondary-color)' }
                  }}
                />
              )}
            </Box>
          </Box>

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
          <FilterByCheckedSelector filterByChecked={handleFilterByChecked} />
          {noteViewSelect === "categories" && (
            <CategoriesSelector
              availableCategories={allCategories}
              filterByCategory={handleFilterByCategory}
              itemCounts={categoryItemCounts}
            />
          )}

          {/* Loading indicator during filter transitions */}
          {isPending && (
            <Box sx={{ width: '100%', position: 'absolute', top: 0, left: 0, zIndex: 10 }}>
              <LinearProgress sx={{ height: 2 }} />
            </Box>
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
              <Box 
                sx={{ 
                  mt: 6, 
                  mb: 2,
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2
                }}
              >
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    bgcolor: 'var(--secondary-color-faded)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <AiOutlineSearch style={{ fontSize: '2.5rem', color: 'var(--secondary-color)', opacity: 0.7 }} />
                </Box>
                <Typography variant="body1" sx={{ color: 'var(--primary-color)', fontWeight: 500 }}>
                  No matching items
                </Typography>
                <Typography variant="body2" sx={{ color: 'var(--primary-color)', opacity: 0.6 }}>
                  Try adjusting your search or filters
                </Typography>
                {searchTerm && (
                  <Chip
                    label="Clear search"
                    onClick={() => setSearchTerm("")}
                    onDelete={() => setSearchTerm("")}
                    size="small"
                    sx={{
                      bgcolor: 'var(--secondary-color-faded)',
                      color: 'var(--secondary-color)',
                      '& .MuiChip-deleteIcon': { color: 'var(--secondary-color)' }
                    }}
                  />
                )}
              </Box>
            ) : (
              <List className={styles.noteListContainer} sx={{ width: '100%', borderRadius: "12px", boxShadow: "0px 2px 18px 3px rgba(0, 0, 0, 0.2)", padding: 0 }}>
                {filteredNoteItems.map((entry, index) => (
                  <NoteListItem
                    key={entry.entryId}
                    entry={entry}
                    index={index}
                    totalItems={filteredNoteItems.length}
                    onToggle={handleToggle}
                    onRename={openConfirmRenameItem}
                    onDelete={openConfirmDeleteItem}
                    resolvedTheme={resolvedTheme}
                  />
                ))}
              </List>
            )
          ) : // Categories view
          filteredNoteItems.length === 0 ? (
            <Box 
              sx={{ 
                mt: 6, 
                mb: 2,
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2
              }}
            >
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  bgcolor: 'var(--secondary-color-faded)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <AiOutlineSearch style={{ fontSize: '2.5rem', color: 'var(--secondary-color)', opacity: 0.7 }} />
              </Box>
              <Typography variant="body1" sx={{ color: 'var(--primary-color)', fontWeight: 500 }}>
                No matching items
              </Typography>
              <Typography variant="body2" sx={{ color: 'var(--primary-color)', opacity: 0.6 }}>
                Try adjusting your search or filters
              </Typography>
              {searchTerm && (
                <Chip
                  label="Clear search"
                  onClick={() => setSearchTerm("")}
                  onDelete={() => setSearchTerm("")}
                  size="small"
                  sx={{
                    bgcolor: 'var(--secondary-color-faded)',
                    color: 'var(--secondary-color)',
                    '& .MuiChip-deleteIcon': { color: 'var(--secondary-color)' }
                  }}
                />
              )}
            </Box>
          ) : (
            groupedNoteItems.map(group => (
              <AnimatePresence key={group.category}>
                <MotionWrap 
                  initial={{ opacity: 0, x: 20 }} 
                  animate={{ opacity: 1, x: 0 }} style={{ width: "100%", marginBottom: "0.2em" }} 
                  exit={{ opacity: 0, x: 20 }} 
                  transition={{ duration: 0.3, type: "spring", stiffness: 100, damping: 20 }} 
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
                        return [...prevState, group.category]
                      }
                    })}
                    sx={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
                      borderRadius: '12px !important',
                      overflow: 'hidden',
                      marginBottom: '1.5em',
                      '&:before': {
                        display: 'none'
                      },
                      '& .MuiAccordionSummary-root': {
                        background: 'rgba(var(--secondary-color-rgb, 99, 102, 241), 0.05)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          background: 'rgba(var(--secondary-color-rgb, 99, 102, 241), 0.1)',
                        }
                      }
                    }}
                  >
                    <AccordionSummary expandIcon={<BsChevronDown className={styles.expandIcon} />} aria-controls="panel1a-content" id="panel1a-header">
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, width: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 1 }}>
                          <Typography variant="body1" sx={{ fontWeight: 500, color: 'var(--primary-color)' }}>
                            {group.category === "none" || group.category === null ? "No category" : group.category}
                          </Typography>
                          {filterByChecked === 'All' && group.data.filter(entry => entry.isChecked).length === group.data.length && (
                            <Chip
                              icon={<BsCheckAll style={{ fontSize: '0.9rem' }} />}
                              label="Complete"
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.65rem',
                                bgcolor: '#4caf5020',
                                color: '#4caf50',
                                '& .MuiChip-icon': { color: '#4caf50' }
                              }}
                            />
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="caption" sx={{ color: 'var(--primary-color)', opacity: 0.6 }}>
                            {group.data.length} {group.data.length === 1 ? 'item' : 'items'}
                          </Typography>
                          {filterByChecked === 'All' && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Box sx={{ width: 40, mr: 0.5 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={(group.data.filter(entry => entry.isChecked).length / group.data.length) * 100}
                                  sx={{
                                    height: 4,
                                    borderRadius: 2,
                                    bgcolor: 'var(--borders-color)',
                                    '& .MuiLinearProgress-bar': {
                                      bgcolor: group.data.filter(entry => entry.isChecked).length === group.data.length
                                        ? '#4caf50'
                                        : 'var(--secondary-color)',
                                      borderRadius: 2
                                    }
                                  }}
                                />
                              </Box>
                              <Typography variant="caption" sx={{ color: 'var(--primary-color)', opacity: 0.5 }}>
                                {group.data.filter(entry => entry.isChecked).length}/{group.data.length}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ padding: 0, position: 'relative' }}>
                      <List className={styles.noteListContainer} sx={{ width: '100%', padding: 0 }}>
                        {group.data.map((entry, index) => (
                          <CategoryListItem
                            key={entry.entryId}
                            entry={entry}
                            index={index}
                            totalItems={group.data.length}
                            category={group.category}
                            onToggle={handleToggle}
                            onRename={openConfirmRenameItem}
                            onDelete={openConfirmDeleteItem}
                            resolvedTheme={resolvedTheme}
                          />
                        ))}
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
          onError={() => showNotification('❌ Failed to add item', 'error')}
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
            if (isDeleted) {
              // Find the entry before removing
              const entryToDelete = noteItemsState?.find(entry => entry.entryId === selectedEntryId)
              
              // Remove from UI
              setNoteItemsState(prevEntries =>
                prevEntries?.filter(entry => entry.entryId !== selectedEntryId)
              )
              
              // Show undo snackbar if we have the entry
              if (entryToDelete) {
                // Clear any existing undo timeout
                if (deletedItem?.timeoutId) {
                  clearTimeout(deletedItem.timeoutId)
                }
                
                // Set up auto-clear after 5 seconds (item already deleted via API)
                const timeoutId = setTimeout(() => {
                  setDeletedItem(null)
                  setShowUndoSnackbar(false)
                }, 5000)
                
                setDeletedItem({ entry: entryToDelete, timeoutId })
                setShowUndoSnackbar(true)
              }
              
              startTransition(() => {
                router.refresh()
              })
            }
          }}
          onError={() => showNotification('❌ Failed to delete item', 'error')}
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
              startTransition(() => {
                router.refresh()
              })
            }
          }}
          onPriorityChange={(isPriorityChanged: boolean, newPriority: string) => {
            if (isPriorityChanged) {
              setNoteItemsState(prevEntries =>
                prevEntries?.map(entry =>
                  entry.entryId === selectedEntryId ? { ...entry, priority: newPriority } : entry
                )
              )
              startTransition(() => {
                router.refresh()
              })
            }
          }}
          onCategoryChange={(isCategoryChanged: boolean, newCategory: string) => {
            if (isCategoryChanged) {
              setNoteItemsState(prevEntries =>
                prevEntries?.map(entry =>
                  entry.entryId === selectedEntryId ? { ...entry, category: newCategory } : entry
                )
              )
              startTransition(() => {
                router.refresh()
              })
            }
          }}
          onError={() => showNotification('❌ Failed to rename item', 'error')}
          onSetPriorityError={() => showNotification('❌ Failed to update priority', 'error')}
          onSetCategoryError={() => showNotification('❌ Failed to update category', 'error')}
        />
      )}

      {showUserEntered && (
        <Snackbar 
          open={showUserEntered} 
          autoHideDuration={3000} 
          onClose={() => setShowUserEntered(false)} 
          anchorOrigin={{ horizontal: "center", vertical: "bottom" }}
        >
          <Alert 
            onClose={() => setShowUserEntered(false)} 
            severity="info" 
            icon={<HiUsers style={{ fontSize: '1.2rem' }} />}
            sx={{ 
              width: '100%',
              bgcolor: 'var(--secondary-color)',
              color: '#fff',
              '& .MuiAlert-icon': { color: '#fff' },
              '& .MuiAlert-action .MuiIconButton-root': { color: '#fff' },
              borderRadius: 2,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}
          >
            👋 Someone joined the note!
          </Alert>
        </Snackbar>
      )}

      {showUserLeft && (
        <Snackbar 
          open={showUserLeft} 
          autoHideDuration={3000} 
          onClose={() => setShowUserLeft(false)} 
          anchorOrigin={{ horizontal: "center", vertical: "bottom" }}
        >
          <Alert 
            onClose={() => setShowUserLeft(false)} 
            severity="info" 
            icon={<HiUser style={{ fontSize: '1.2rem' }} />}
            sx={{ 
              width: '100%',
              bgcolor: 'var(--note-card-background-card-item)',
              color: 'var(--primary-color)',
              border: '1px solid var(--borders-color)',
              '& .MuiAlert-icon': { color: 'var(--primary-color)' },
              borderRadius: 2,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
          >
            User left the note
          </Alert>
        </Snackbar>
      )}

      {/* ✅ Unified notification system - replaces 6 duplicate error snackbars */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ horizontal: "center", vertical: "bottom" }}
      >
        <Alert
          onClose={() => setNotification(prev => ({ ...prev, open: false }))}
          severity={notification.severity}
          icon={notification.icon}
          sx={{
            width: '100%',
            borderRadius: 2,
            boxShadow: notification.severity === 'error'
              ? '0 4px 12px rgba(244,67,54,0.2)'
              : '0 4px 12px rgba(0,0,0,0.1)'
          }}
        >
          {notification.message}
        </Alert>
      </Snackbar>

      {/* Undo delete snackbar */}
      <Snackbar
        open={showUndoSnackbar}
        autoHideDuration={5000}
        onClose={() => setShowUndoSnackbar(false)}
        anchorOrigin={{ horizontal: "center", vertical: "bottom" }}
      >
        <Alert
          severity="info"
          icon={<MdUndo style={{ fontSize: '1.2rem' }} />}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={handleUndoDelete}
              sx={{
                fontWeight: 600,
                textTransform: 'none',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              Undo
            </Button>
          }
          sx={{
            width: '100%',
            bgcolor: '#323232',
            color: '#fff',
            '& .MuiAlert-icon': { color: '#fff' },
            '& .MuiAlert-action': { color: '#90caf9' },
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            alignItems: 'center'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span>Item deleted</span>
            {deletedItem && (
              <Typography 
                variant="caption" 
                sx={{ 
                  opacity: 0.7,
                  maxWidth: 150,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                &ldquo;{deletedItem.entry.item}&rdquo;
              </Typography>
            )}
          </Box>
        </Alert>
      </Snackbar>
    </>
  )
}