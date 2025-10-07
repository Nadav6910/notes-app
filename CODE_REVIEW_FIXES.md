# Code Review: Detailed Fix Examples

This document provides detailed, ready-to-implement code fixes for the issues identified in the code review.

---

## ProfileAvatar.tsx Fixes

### Fix 1: Consistent Size Validation and Constants

**Before:**
```typescript
const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const imageFile = event.target.files?.[0]
  const maxSize = 5242880 // 5MB

  if (!imageFile) return
  
  // ... validation
  
  if (imageFile.size > maxSize) {
    setImageSizeError(true)
    setTimeout(() => setImageSizeError(false), 3000)
    // ...
  }
  
  // ... later in code
  const maxWidth = 300
  const maxHeight = 300
  // ...
  const compressedImageStr = canvas.toDataURL('image/jpeg', 0.4)
}
```

**After:**
```typescript
// Add at the top of the file, after imports
const MAX_FILE_SIZE = 3 * 1024 * 1024 // 3MB
const MAX_IMAGE_WIDTH = 300
const MAX_IMAGE_HEIGHT = 300
const COMPRESSION_QUALITY = 0.4
const NOTIFICATION_DURATION = 3000

const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const imageFile = event.target.files?.[0]

  if (!imageFile) return
  
  // ... validation
  
  if (imageFile.size > MAX_FILE_SIZE) {
    setImageSizeError(true)
    setTimeout(() => setImageSizeError(false), NOTIFICATION_DURATION)
    // ...
  }
  
  // ... later in code
  const maxWidth = MAX_IMAGE_WIDTH
  const maxHeight = MAX_IMAGE_HEIGHT
  // ...
  const compressedImageStr = canvas.toDataURL('image/jpeg', COMPRESSION_QUALITY)
}
```

### Fix 2: Better Error Handling with Proper Types

**Before:**
```typescript
catch (error) {
  console.log(error)
}
```

**After:**
```typescript
catch (error) {
  console.error('Image upload failed:', error instanceof Error ? error.message : 'Unknown error')
  setUploadError(true)
  setTimeout(() => setUploadError(false), NOTIFICATION_DURATION)
}
```

### Fix 3: Custom Hook for Auto-Hide State

**Create new file: `src/utils/hooks.ts`**
```typescript
import { useState, useCallback } from 'react'

export const useAutoHideState = (duration = 3000) => {
  const [state, setState] = useState(false)
  
  const setAutoHide = useCallback((value: boolean) => {
    setState(value)
    if (value) {
      setTimeout(() => setState(false), duration)
    }
  }, [duration])
  
  return [state, setAutoHide] as const
}
```

**Usage in ProfileAvatar.tsx:**
```typescript
import { useAutoHideState } from '@/utils/hooks'

export default function ProfileAvatar({userImage, userId}: {userImage: string | undefined, userId: string | undefined}) {
  const router = useRouter()
  const [profileImage, setProfileImage] = useState(userImage)
  
  // Replace individual state declarations with:
  const [showSuccessMessage, setShowSuccessMessage] = useAutoHideState(NOTIFICATION_DURATION)
  const [imageTypeError, setImageTypeError] = useAutoHideState(NOTIFICATION_DURATION)
  const [imageSizeError, setImageSizeError] = useAutoHideState(NOTIFICATION_DURATION)
  const [uploadError, setUploadError] = useAutoHideState(NOTIFICATION_DURATION)
  
  // Then in your code, instead of:
  // setImageTypeError(true)
  // setTimeout(() => setImageTypeError(false), 3000)
  
  // Use:
  setImageTypeError(true)
}
```

### Fix 4: Cleanup Event Handlers

**Before:**
```typescript
const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  // ...
  try {
    const reader = new FileReader()
    reader.readAsDataURL(imageFile)
    reader.onloadend = () => {
      const originalImage = new Image()
      originalImage.src = reader.result as string
      
      originalImage.onload = async () => {
        // ... compression logic
      }
    }
    
    reader.onerror = () => {
      setUploadError(true)
      setTimeout(() => setUploadError(false), 3000)
    }
  } catch (error) {
    console.log(error)
  }
}
```

**After:**
```typescript
const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  // ...
  try {
    const reader = new FileReader()
    let isCancelled = false
    
    const cleanup = () => {
      isCancelled = true
      reader.abort()
    }
    
    reader.readAsDataURL(imageFile)
    reader.onloadend = () => {
      if (isCancelled) return
      
      const originalImage = new Image()
      originalImage.src = reader.result as string
      
      originalImage.onload = async () => {
        if (isCancelled) return
        // ... compression logic
      }
    }
    
    reader.onerror = () => {
      if (isCancelled) return
      console.error('FileReader error:', reader.error)
      setUploadError(true)
    }
    
    // Store cleanup function if needed for component unmount
  } catch (error) {
    console.error('Image upload failed:', error instanceof Error ? error.message : 'Unknown error')
    setUploadError(true)
  }
}
```

---

## NoteBook.tsx Fixes

### Fix 1: Remove Direct State Mutation

**Before:**
```typescript
const handleSaveNotebook = async () => {
  setLoading(true)

  if (noteEntries?.[0]?.item === NotebookText) {
    setLoading(false)
    setNoChangeMadeError(true)
    return
  }

  if (noteEntries && noteEntries?.length > 0) {
    noteEntries[0].item = NotebookText!  // ❌ Direct mutation
  }
  
  try {
    const response = await fetch('/api/save-notebook', {
      method: "POST",
      body: JSON.stringify({noteId, itemName: NotebookText, entryId: noteEntries?.[0]?.entryId}),
      cache: "no-cache",
    })
    // ...
  }
}
```

**After:**
```typescript
const handleSaveNotebook = async () => {
  setLoading(true)

  if (noteEntries?.[0]?.item === NotebookText) {
    setLoading(false)
    setNoChangeMadeError(true)
    return
  }
  
  try {
    const response = await fetch('/api/save-notebook', {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        noteId, 
        itemName: NotebookText, 
        entryId: noteEntries?.[0]?.entryId
      }),
      cache: "no-cache",
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.message === "success") {  // ✅ Fixed typo: massage → message
      setLoading(false)
      setOpenSuccess(true)
    } else {
      setLoading(false)
      setOpenSaveNoteError(true)
    }
  } catch (error) {
    console.error('Save notebook failed:', error instanceof Error ? error.message : 'Unknown error')
    setLoading(false)
    setOpenSaveNoteError(true)
  }
}
```

### Fix 2: Proper Scroll Listener Cleanup

**Before:**
```typescript
useEffect(() => {
  const handleScroll = () => {
    const saveNoteButton = saveNoteButtonRef.current
    if (saveNoteButton) {
      const { top, bottom } = saveNoteButton.getBoundingClientRect()
      const isElementVisible = top < window.innerHeight && bottom >= 0
      
      if (!isElementVisible && isButtonVisible) {
        setIsButtonVisible(false)
      } else if (isElementVisible && !isButtonVisible) {
        setIsButtonVisible(true)
      }
    }
  }

  scrollY.on("change", handleScroll)

  return () => {
    scrollY.clearListeners()  // ❌ Clears ALL listeners
  }
}, [scrollY, isButtonVisible])
```

**After:**
```typescript
useEffect(() => {
  const handleScroll = () => {
    const saveNoteButton = saveNoteButtonRef.current
    if (saveNoteButton) {
      const { top, bottom } = saveNoteButton.getBoundingClientRect()
      const isElementVisible = top < window.innerHeight && bottom >= 0
      
      if (!isElementVisible && isButtonVisible) {
        setIsButtonVisible(false)
      } else if (isElementVisible && !isButtonVisible) {
        setIsButtonVisible(true)
      }
    }
  }

  scrollY.on("change", handleScroll)

  return () => {
    scrollY.off("change", handleScroll)  // ✅ Only removes this listener
  }
}, [scrollY, isButtonVisible])
```

### Fix 3: State Naming Convention

**Before:**
```typescript
const [NotebookText, setNotebookText] = useState(noteEntries?.[0]?.item)
```

**After:**
```typescript
const [notebookText, setNotebookText] = useState(noteEntries?.[0]?.item)
```

Then update all references from `NotebookText` to `notebookText` throughout the component.

### Fix 4: Debounced Scroll Handler

**Create throttle utility in `src/utils/performance.ts`:**
```typescript
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0
  return (...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastCall >= delay) {
      lastCall = now
      func(...args)
    }
  }
}
```

**Updated useEffect:**
```typescript
import { throttle } from '@/utils/performance'
import { useCallback } from 'react'

// Inside component:
const handleScroll = useCallback(
  throttle(() => {
    const saveNoteButton = saveNoteButtonRef.current
    if (saveNoteButton) {
      const { top, bottom } = saveNoteButton.getBoundingClientRect()
      const isElementVisible = top < window.innerHeight && bottom >= 0
      
      setIsButtonVisible(isElementVisible)
    }
  }, 100),
  []
)

useEffect(() => {
  scrollY.on("change", handleScroll)
  
  return () => {
    scrollY.off("change", handleScroll)
  }
}, [scrollY, handleScroll])
```

### Fix 5: Prevent Race Conditions

**Before:**
```typescript
<div 
  onClick={handleSaveNotebook} 
  className={styles.addItemToNote}
  ref={saveNoteButtonRef}
>
```

**After:**
```typescript
<div 
  onClick={!loading ? handleSaveNotebook : undefined} 
  className={`${styles.addItemToNote} ${loading ? styles.disabled : ''}`}
  ref={saveNoteButtonRef}
  style={{ cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
>
```

---

## MenuDrawer.tsx Fixes

### Fix 1: Simplify State Management

**Before:**
```typescript
const [state, setState] = useState({
  right: false,
})

const toggleDrawer = (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
  if (
    event.type === 'keydown' &&
    ((event as React.KeyboardEvent).key === 'Tab' ||
    (event as React.KeyboardEvent).key === 'Shift')
  ) {
    return
  }

  setState({ ...state, "right": open })
}
```

**After:**
```typescript
const [isOpen, setIsOpen] = useState(false)

const toggleDrawer = (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
  if (
    event.type === 'keydown' &&
    ((event as React.KeyboardEvent).key === 'Tab' ||
    (event as React.KeyboardEvent).key === 'Shift')
  ) {
    return
  }

  setIsOpen(open)
}

// Update Drawer component:
<Drawer
  PaperProps={{className: styles.menuDrawer}}
  anchor="right"
  open={isOpen}
  onClose={toggleDrawer(false)}
>
  {list()}
</Drawer>
```

### Fix 2: Lazy Prefetching

**Before:**
```typescript
useEffect(() => {
  // Prefetch pages for faster navigation
  router.prefetch('/my-notes')
  router.prefetch('/profile')
}, [router])
```

**After:**
```typescript
const [hasPrefetched, setHasPrefetched] = useState(false)

const toggleDrawer = (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
  if (
    event.type === 'keydown' &&
    ((event as React.KeyboardEvent).key === 'Tab' ||
    (event as React.KeyboardEvent).key === 'Shift')
  ) {
    return
  }

  // Prefetch on first open
  if (open && !hasPrefetched && isSession) {
    router.prefetch('/my-notes')
    router.prefetch('/profile')
    setHasPrefetched(true)
  }

  setIsOpen(open)
}

// Remove the useEffect for prefetching
```

### Fix 3: Better Theme Handling

**Before:**
```typescript
const theme = useTheme()

// Later in code:
style={{color: theme.theme === "dark" ? "white" : "black"}}
```

**After:**
```typescript
const { theme, resolvedTheme } = useTheme()
const currentTheme = theme || resolvedTheme || 'light'

// Later in code:
style={{color: currentTheme === "dark" ? "white" : "black"}}
```

### Fix 4: Add Accessibility

**Before:**
```typescript
<IconButton onClick={toggleDrawer(true)}>
  <HiOutlineMenuAlt3 className={styles.menuIcon} />
</IconButton>
```

**After:**
```typescript
<IconButton 
  onClick={toggleDrawer(true)}
  aria-label="Open navigation menu"
  aria-expanded={isOpen}
>
  <HiOutlineMenuAlt3 className={styles.menuIcon} />
</IconButton>
```

### Fix 5: Error Handling for Sign Out

**Before:**
```typescript
<ListItemButton sx={{gap: "1em"}} onClick={() => signOut()}>
```

**After:**
```typescript
const handleSignOut = async () => {
  try {
    await signOut({ callbackUrl: '/' })
  } catch (error) {
    console.error('Logout failed:', error)
    // Optionally show error notification to user
  }
}

// In JSX:
<ListItemButton sx={{gap: "1em"}} onClick={handleSignOut}>
```

### Fix 6: Memoize Drawer Content

**Before:**
```typescript
const list = () => (
  <Box
    role="presentation"
    // ... rest of content
  >
    {/* content */}
  </Box>
)

return (
  <>
    {/* ... */}
    <Drawer>
      {list()}
    </Drawer>
  </>
)
```

**After:**
```typescript
import { useMemo } from 'react'

const drawerContent = useMemo(() => (
  <Box
    role="presentation"
    onClick={e => {
      const target = e.target as HTMLElement
      if (!target.classList.contains("PrivateSwitchBase-input")) {
        toggleDrawer(false)(e)
      }
    }}
    onKeyDown={toggleDrawer(false)}
  >
    {/* existing content - wrap in fragment if needed */}
  </Box>
), [isSession, userName, userImage, currentTheme])

return (
  <>
    {/* ... */}
    <Drawer>
      {drawerContent}
    </Drawer>
  </>
)
```

---

## Common Patterns

### Pattern 1: Fetch Request Helper

**Create `src/utils/api.ts`:**
```typescript
export async function fetchJSON<T>(
  url: string, 
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return response.json()
}
```

**Usage:**
```typescript
import { fetchJSON } from '@/utils/api'

// In ProfileAvatar:
const response = await fetchJSON('/api/upload-profile-image', {
  method: 'POST',
  body: JSON.stringify({profileImage: compressedImageStr, userId})
})

// In NoteBook:
const data = await fetchJSON<{message: string}>('/api/save-notebook', {
  method: 'POST',
  body: JSON.stringify({noteId, itemName: notebookText, entryId: noteEntries?.[0]?.entryId}),
  cache: 'no-cache',
})
```

### Pattern 2: Notification Component

**Create `src/components/common/Notification.tsx`:**
```typescript
import { Snackbar, Alert } from '@mui/material'

type NotificationProps = {
  open: boolean
  onClose: () => void
  message: string
  severity: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

export default function Notification({
  open,
  onClose,
  message,
  severity,
  duration = 3000
}: NotificationProps) {
  return (
    <Snackbar
      open={open}
      autoHideDuration={duration}
      onClose={onClose}
      anchorOrigin={{horizontal: "center", vertical: "bottom"}}
    >
      <Alert onClose={onClose} severity={severity} sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  )
}
```

**Usage:**
```typescript
import Notification from '@/components/common/Notification'

// Replace all Snackbar instances with:
<Notification
  open={uploadError}
  onClose={() => setUploadError(false)}
  message="Error uploading image. Please try again"
  severity="error"
/>
```

---

## Summary

These fixes address:
- ✅ Consistency in validation and constants
- ✅ Proper error handling and types
- ✅ React best practices (no mutations)
- ✅ Memory leak prevention
- ✅ Performance optimization
- ✅ Code reusability and maintainability
- ✅ Accessibility improvements

Implementing these changes will significantly improve code quality, reliability, and maintainability.
