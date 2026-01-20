import { useEffect, useRef, useCallback, useState } from 'react'
import { useDebouncedValue } from './useDebouncedValue'

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'

interface UseAutoSaveOptions {
  onSave: (content: string) => Promise<boolean>
  delay?: number
  enabled?: boolean
}

export function useAutoSave(
  content: string,
  initialContent: string,
  options: UseAutoSaveOptions
) {
  const { onSave, delay = 5000, enabled = true } = options

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [savedContent, setSavedContent] = useState(initialContent)

  const isSavingRef = useRef(false)
  const mountedRef = useRef(true)
  const contentRef = useRef(content)
  const savedContentRef = useRef(initialContent)

  // Keep refs updated
  useEffect(() => {
    contentRef.current = content
  }, [content])

  // Track if content has changed from last saved version
  const hasChanges = content !== savedContent

  // Debounced content for auto-save trigger
  const debouncedContent = useDebouncedValue(content, delay)

  // Update status when content changes
  useEffect(() => {
    if (hasChanges && saveStatus === 'saved') {
      setSaveStatus('unsaved')
    } else if (!hasChanges && (saveStatus === 'unsaved' || saveStatus === 'error')) {
      setSaveStatus('saved')
    }
  }, [content, hasChanges, saveStatus])

  // Save function
  const save = useCallback(async (contentToSave: string): Promise<boolean> => {
    // Don't save if already saving or if content matches last saved
    if (isSavingRef.current || contentToSave === savedContentRef.current) {
      return false
    }

    isSavingRef.current = true
    setSaveStatus('saving')

    try {
      const success = await onSave(contentToSave)

      if (mountedRef.current) {
        if (success) {
          setSaveStatus('saved')
          setLastSaved(new Date())
          // Update saved content refs and state
          savedContentRef.current = contentToSave
          setSavedContent(contentToSave)
        } else {
          setSaveStatus('error')
        }
      }

      return success
    } catch {
      if (mountedRef.current) {
        setSaveStatus('error')
      }
      return false
    } finally {
      isSavingRef.current = false
    }
  }, [onSave])

  // Auto-save when debounced content changes
  useEffect(() => {
    if (enabled && debouncedContent !== savedContentRef.current && !isSavingRef.current) {
      save(debouncedContent)
    }
  }, [debouncedContent, enabled, save])

  // Save on unmount
  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      // Save on unmount if there are unsaved changes
      const currentContent = contentRef.current
      const lastSavedContent = savedContentRef.current
      if (currentContent !== lastSavedContent && !isSavingRef.current) {
        // Fire and forget - component is unmounting
        onSave(currentContent)
      }
    }
  }, [onSave])

  // Save on beforeunload (browser close/refresh)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const currentContent = contentRef.current
      const lastSavedContent = savedContentRef.current
      if (currentContent !== lastSavedContent) {
        // Show browser warning
        e.preventDefault()
        e.returnValue = ''
        // Attempt async save (may not complete)
        onSave(currentContent)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [onSave])

  // Manual save trigger
  const triggerSave = useCallback(() => save(contentRef.current), [save])

  return {
    saveStatus,
    hasChanges,
    lastSaved,
    save: triggerSave,
    isSaving: saveStatus === 'saving'
  }
}
