# Robust Update Plan

**Created:** January 16, 2026
**Based on:** CODE_REVIEW_MAIN_COMPONENTS.md

This document provides a structured, phased approach to implementing the improvements identified in the code review.

---

## Phase 1: Critical Bug Fixes (Security & Data Integrity)

### 1.1 Password Validation Alignment

**Files to modify:**
- `src/app/api/register/route.ts`

**Changes:**
```typescript
// Change line 23-24 from:
if (password.length < 6) {
// To:
if (password.length < 8) {
    return NextResponse.json({error: "password must be at least 8 characters"}, { status: 400 })
}
```

**Testing:**
- [ ] Try registering with 7-character password (should fail)
- [ ] Try registering with 8-character password (should succeed)

---

### 1.2 Fix handleToggle Rollback Logic

**File:** `src/components/note-page-components/NoteItemsList.tsx`

**Changes at lines 251-256:**
```typescript
// Change from:
entry.entryId === entryId ? { ...entry, isChecked: !value } : entry
// To:
entry.entryId === entryId ? { ...entry, isChecked: value } : entry
```

**Testing:**
- [ ] Disconnect network, toggle item, verify it reverts

---

### 1.3 Fix OnDelete State Return

**File:** `src/components/note-page-components/NoteItemsList.tsx`

**Changes at lines 816-828:**
```typescript
OnDelete={(isDeleted: boolean) => {
    if (isDeleted) {
        setNoteItemsState(prevEntries => {
            const filtered = prevEntries?.filter(entry => entry.entryId !== selectedEntryId) ?? []
            if (filtered.length === 0) {
                router.refresh()
            }
            return filtered
        })
    }
}}
```

---

### 1.4 Fix Social Login Password Security

**File:** `src/app/api/auth/[...nextauth]/options.ts`

**Changes at line 99:**
```typescript
// Change from:
password: "social-account"
// To:
password: crypto.randomUUID()
```

---

## Phase 2: High Priority Fixes

### 2.1 Fix Login Error Handling Logic

**File:** `src/components/login_page_components/LoginForm.tsx`

**Changes at lines 48-68:**
```typescript
if (loginResponse?.error === 'wrong user name') {
    setUserNameErr(true)
    setTimeout(() => setUserNameErr(false), 2000)
}
else if (loginResponse?.error === 'wrong password') {
    setPasswordErr(true)
    setTimeout(() => setPasswordErr(false), 2000)
}
else if (loginResponse?.error) {
    setOpenError(true)
}
else if (loginResponse?.ok) {
    setOpenSuccess(true)
}
```

---

### 2.2 Add API Route Validations

**File:** `src/app/api/create-note/route.ts`

**Add after line 7:**
```typescript
// Validate required fields
if (!userId || !noteName?.trim() || !noteType) {
    return NextResponse.json({error: "userId, noteName, and noteType are required"}, { status: 400 })
}

// Validate noteName length
if (noteName.length < 2 || noteName.length > 25) {
    return NextResponse.json({error: "noteName must be 2-25 characters"}, { status: 400 })
}

// Validate noteType
const validTypes = ['Items list', 'Notebook']
if (!validTypes.includes(noteType)) {
    return NextResponse.json({error: "Invalid note type"}, { status: 400 })
}

// Verify userId exists
const user = await prisma.user.findUnique({ where: { id: userId } })
if (!user) {
    return NextResponse.json({error: "User not found"}, { status: 404 })
}
```

---

### 2.3 Fix Throttle Implementation

**File:** `src/components/note-page-components/NoteItemsList.tsx`

**Replace lines 63-77 and 194-208:**
```typescript
// Move throttle creation outside component or use useMemo
const throttledScrollHandler = useMemo(() => {
    let inThrottle = false
    return () => {
        if (!inThrottle) {
            const addItemButton = addItemButtonRef.current
            if (addItemButton) {
                const { top, bottom } = addItemButton.getBoundingClientRect()
                const isElementVisible = top < window.innerHeight && bottom >= 0
                setIsButtonVisible(isElementVisible)
            }
            inThrottle = true
            setTimeout(() => { inThrottle = false }, 100)
        }
    }
}, [])

useEffect(() => {
    scrollY.on("change", throttledScrollHandler)
    return () => scrollY.clearListeners()
}, [scrollY, throttledScrollHandler])
```

---

### 2.4 Reduce Unnecessary router.refresh() Calls

**File:** `src/components/note-page-components/NoteItemsList.tsx`

**Remove these lines** (optimistic updates already handle UI):
- Line 283: `router.refresh()` in handleAddNoteItem
- Line 435: `router.refresh()` in empty notes add
- Line 856: `router.refresh()` in onRename callback
- Line 866: `router.refresh()` in onPriorityChange callback
- Line 876: `router.refresh()` in onCategoryChange callback

**Keep only** essential refresh calls when data truly needs server sync.

---

### 2.5 Add AbortController to API Calls

**Example for LoginForm.tsx:**
```typescript
const login = async (data: LoginFormValues) => {
    const controller = new AbortController()

    try {
        const loginResponse = await signIn('credentials', {
            userName: data.userName,
            password: data.password,
            redirect: false
        })
        // Handle response...
    } catch (error) {
        if (error.name === 'AbortError') return
        setOpenError(true)
    }
}

// In useEffect cleanup
useEffect(() => {
    const controller = new AbortController()
    return () => controller.abort()
}, [])
```

---

## Phase 3: UX Improvements

### 3.1 Handle or Remove "Forgot Password"

**Option A - Remove temporarily:**
```typescript
<p className={styles.forgotPassLink} style={{ opacity: 0.5, cursor: 'default' }}>
    Forgot Password? (Coming soon)
</p>
```

**Option B - Implement password reset flow** (requires email integration)

---

### 3.2 Add Loading Indicators for Async Actions

**File:** `src/components/note-page-components/NoteItemsList.tsx`

```typescript
// Add state
const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set())

// In handleToggle
const handleToggle = useCallback(async (value: boolean | null | undefined, entryId: string) => {
    setLoadingItems(prev => new Set(prev).add(entryId))
    // ... existing logic
    setLoadingItems(prev => {
        const next = new Set(prev)
        next.delete(entryId)
        return next
    })
}, [noteId])

// In render
{loadingItems.has(entry.entryId) && <CircularProgress size={16} />}
```

---

### 3.3 Improve Error Messages

**Create error message utility:**
```typescript
// src/lib/errorMessages.ts
export const getErrorMessage = (error: string): string => {
    const messages: Record<string, string> = {
        'Failed to fetch': 'Connection lost. Please check your internet and try again.',
        'timeout': 'The request took too long. Please try again.',
        'unauthorized': 'Your session has expired. Please log in again.',
        // Add more...
    }
    return messages[error] || 'Something went wrong. Please try again.'
}
```

---

### 3.4 Add Keyboard Shortcuts

**Create hook:**
```typescript
// src/app/hooks/useKeyboardShortcuts.ts
import { useEffect } from 'react'

export function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const key = `${e.ctrlKey ? 'Ctrl+' : ''}${e.key}`
            if (shortcuts[key]) {
                e.preventDefault()
                shortcuts[key]()
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [shortcuts])
}
```

---

### 3.5 Enhance Empty States

**File:** `src/components/note-page-components/NoteItemsList.tsx`

```typescript
<div className={styles.noNoteItemsContainer}>
    <NoNoteItemsDrawing />
    <h3>Your note is empty</h3>
    <p style={{ color: 'gray', marginBottom: '1em' }}>
        Add items to create a checklist. You can set priorities and categories to stay organized.
    </p>
    <div onClick={() => setOpenAddItemPopupEmpty(true)} className={styles.addItemToNoteEmptyNotes}>
        <FaPlus />
        <p>Add your first item</p>
    </div>
</div>
```

---

## Phase 4: Performance Optimizations

### 4.1 Optimize FlipNumbers

**Replace key-based remounting with prop updates:**
```typescript
<FlipNumbers
    height={15.5}
    width={11.5}
    duration={1.5}
    numbers={filteredNoteItems?.length.toString() ?? '0'}
    play
    perspective={100}
    numberStyle={{ color: resolvedTheme === 'dark' ? 'white' : 'black' }}
/>
```

---

### 4.2 Conditional Prefetching

**File:** `src/components/my-notes-page-components/NoteCard.tsx`

**Remove useEffect prefetch, add to component:**
```typescript
<Card
    className={styles.cardContainer}
    onMouseEnter={() => router.prefetch(`/my-notes/note/${noteId}`)}
>
```

---

### 4.3 Debounce Default Optimization

**File:** `src/app/hooks/useDebouncedValue.ts`

```typescript
export function useDebouncedValue<T>(value: T, delay = 400) {  // Changed from 2400
```

---

### 4.4 Memoize formatDate Results

**Option A - Use React.memo on date displays**
**Option B - Pre-format dates on data fetch**

```typescript
const formattedEntries = useMemo(() =>
    noteItemsState?.map(entry => ({
        ...entry,
        formattedDate: formatDate(entry.createdAt)
    })) ?? []
, [noteItemsState])
```

---

## Implementation Schedule

| Phase | Items | Priority | Estimated Effort |
|-------|-------|----------|------------------|
| Phase 1 | 4 critical bugs | Immediate | 2-3 hours |
| Phase 2 | 5 high priority | Next sprint | 4-6 hours |
| Phase 3 | 5 UX improvements | Following sprint | 6-8 hours |
| Phase 4 | 4 optimizations | Backlog | 4-5 hours |

---

## Testing Checklist

### Phase 1
- [ ] Password validation works consistently frontend/backend
- [ ] Toggle rollback works on network failure
- [ ] Delete last item doesn't break state
- [ ] Social login creates secure random password

### Phase 2
- [ ] Login errors display correctly
- [ ] API rejects invalid inputs
- [ ] Scroll performance improved
- [ ] No unnecessary page reloads

### Phase 3
- [ ] Forgot password handled gracefully
- [ ] Loading states visible during actions
- [ ] Error messages are helpful
- [ ] Keyboard shortcuts work

### Phase 4
- [ ] Theme changes don't cause flicker
- [ ] Prefetch only on hover
- [ ] Search feels responsive
- [ ] Large note lists perform well

---

## Rollback Plan

For each phase:
1. Create feature branch
2. Implement changes
3. Run full test suite
4. Deploy to staging
5. Verify no regressions
6. Merge to main

If issues arise:
- Revert merge commit
- Investigate in feature branch
- Re-deploy previous stable version

---

## Monitoring

After deployment, monitor:
- Error rates in server logs
- Client-side error tracking
- User feedback channels
- Performance metrics (Core Web Vitals)

---

*Document will be updated as implementation progresses.*
