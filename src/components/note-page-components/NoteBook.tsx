'use client'

import styles from "../../app/my-notes/note/[noteId]/styles/notePage.module.css"
import { useState, useEffect, useRef, useCallback } from "react"
import { CircularProgress, Snackbar, Alert, Tooltip, Divider, Popover, TextField, Button, IconButton } from "@mui/material"
import { formatDate } from "@/lib/utils"
import { AiFillSave } from "react-icons/ai"
import {
    MdCloudDone, MdEdit, MdError, MdFormatBold, MdFormatItalic, MdFormatUnderlined,
    MdFormatStrikethrough, MdFormatQuote, MdCode, MdFormatListBulleted, MdFormatListNumbered,
    MdLink, MdHorizontalRule, MdTitle, MdUndo, MdRedo, MdFormatAlignLeft, MdFormatAlignCenter,
    MdFormatAlignRight, MdImage, MdCheckBox, MdHighlight,
    MdFormatColorText, MdTableChart, MdVideoLibrary,
    MdClose, MdDeleteOutline, MdAddBox
} from "react-icons/md"
import { Entry } from "../../../types"
import { useScroll, AnimatePresence } from 'framer-motion'
import MotionWrap from "@/wrappers/MotionWrap"
import { useAutoSave, SaveStatus } from "@/app/hooks/useAutoSave"

// TipTap imports
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Highlight from '@tiptap/extension-highlight'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import TextAlign from '@tiptap/extension-text-align'
import ImageResize from 'tiptap-extension-resize-image'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import Youtube from '@tiptap/extension-youtube'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'

// Create lowlight instance with common languages
const lowlight = createLowlight(common)

// Custom Link extension to avoid duplicate warnings
const CustomLink = Link.extend({
    name: 'customLink',
})

// Custom Underline extension to avoid duplicate warnings
const CustomUnderline = Underline.extend({
    name: 'customUnderline',
})

// Create extensions array ONCE at module level to prevent duplicates in React StrictMode
// This ensures the exact same extension instances are used across all renders
const EDITOR_EXTENSIONS = [
    StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false, // Using CodeBlockLowlight instead for syntax highlighting
    }),
    CustomUnderline,
    CustomLink.configure({
        openOnClick: true,
        HTMLAttributes: {
            class: styles.editorLink,
            target: '_blank',
            rel: 'noopener noreferrer',
        },
    }),
    TaskList,
    TaskItem.configure({
        nested: true,
    }),
    Highlight.configure({
        multicolor: true,
    }),
    TextStyle,
    Color,
    TextAlign.configure({
        types: ['heading', 'paragraph'],
    }),
    ImageResize.configure({
        HTMLAttributes: {
            class: styles.editorImage,
        },
        allowBase64: true,
    }),
    Table.configure({
        resizable: true,
        HTMLAttributes: {
            class: styles.editorTable,
        },
    }),
    TableRow,
    TableHeader,
    TableCell,
    Placeholder.configure({
        placeholder: 'Start writing your thoughts...',
    }),
    Typography,
    Youtube.configure({
        HTMLAttributes: {
            class: styles.editorYoutube,
        },
    }),
    CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
            class: styles.editorCodeBlock,
        },
    }),
]

// Color palette for highlights and text colors
const COLORS = [
    { name: 'Yellow', value: '#fef08a' },
    { name: 'Green', value: '#bbf7d0' },
    { name: 'Blue', value: '#bfdbfe' },
    { name: 'Purple', value: '#ddd6fe' },
    { name: 'Pink', value: '#fbcfe8' },
    { name: 'Orange', value: '#fed7aa' },
]

const TEXT_COLORS = [
    { name: 'Default', value: '' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Purple', value: '#a855f7' },
]

// Helper function for text statistics
function getTextStats(text: string) {
    const plainText = text.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')
    const charCount = plainText.length
    const wordCount = plainText.trim() === '' ? 0 : plainText.trim().split(/\s+/).length
    return { charCount, wordCount }
}

// Helper to ensure URL has protocol
function ensureProtocol(url: string): string {
    if (!url) return url
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:')) {
        return url
    }
    return `https://${url}`
}

// Save Status Indicator component
function SaveStatusIndicator({ status, lastSaved }: { status: SaveStatus; lastSaved: Date | null }) {
    const getConfig = () => {
        switch (status) {
            case 'saved':
                return { icon: <MdCloudDone />, text: 'Saved', color: 'var(--secondary-color)' }
            case 'saving':
                return { icon: <CircularProgress size={14} sx={{ color: 'var(--primary-color)' }} />, text: 'Saving...', color: 'var(--primary-color)' }
            case 'unsaved':
                return { icon: <MdEdit />, text: 'Unsaved', color: '#f59e0b' }
            case 'error':
                return { icon: <MdError />, text: 'Error', color: '#ef4444' }
        }
    }

    const config = getConfig()

    return (
        <MotionWrap
            className={styles.saveStatus}
            style={{ color: config.color }}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
        >
            {config.icon}
            <span>{config.text}</span>
            {status === 'saved' && lastSaved && (
                <span className={styles.lastSavedTime}>
                    at {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            )}
        </MotionWrap>
    )
}

// Toolbar button component with fixed tooltip
function ToolbarButton({
    icon,
    tooltip,
    onClick,
    shortcut,
    isActive = false,
    disabled = false
}: {
    icon: React.ReactNode
    tooltip: string
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
    shortcut?: string
    isActive?: boolean
    disabled?: boolean
}) {
    const [showTooltip, setShowTooltip] = useState(false)

    return (
        <Tooltip
            title={shortcut ? `${tooltip} (${shortcut})` : tooltip}
            arrow
            placement="top"
            open={showTooltip && !disabled}
            onOpen={() => setShowTooltip(true)}
            onClose={() => setShowTooltip(false)}
            disableInteractive
            enterDelay={300}
            leaveDelay={0}
        >
            <span>
                <button
                    type="button"
                    className={`${styles.toolbarButton} ${isActive ? styles.toolbarButtonActive : ''}`}
                    onClick={(e) => {
                        setShowTooltip(false)
                        onClick(e)
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseLeave={() => setShowTooltip(false)}
                    disabled={disabled}
                >
                    {icon}
                </button>
            </span>
        </Tooltip>
    )
}

// Color picker dropdown
function ColorPicker({
    colors,
    onSelect,
    currentColor,
    icon,
    tooltip
}: {
    colors: { name: string; value: string }[]
    onSelect: (color: string) => void
    currentColor?: string
    icon: React.ReactNode
    tooltip: string
}) {
    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null)

    return (
        <>
            <Tooltip title={tooltip} arrow placement="top" disableInteractive enterDelay={300} leaveDelay={0}>
                <button
                    type="button"
                    className={`${styles.toolbarButton} ${currentColor ? styles.toolbarButtonActive : ''}`}
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                    onMouseDown={(e) => e.preventDefault()}
                >
                    {icon}
                </button>
            </Tooltip>
            <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                slotProps={{
                    paper: {
                        className: styles.colorPickerPopover
                    }
                }}
            >
                <div className={styles.colorPickerGrid}>
                    {colors.map((color) => (
                        <button
                            key={color.name}
                            className={`${styles.colorPickerItem} ${currentColor === color.value ? styles.colorPickerItemActive : ''}`}
                            style={{ backgroundColor: color.value || 'var(--note-card-background-card-item)' }}
                            onClick={() => {
                                onSelect(color.value)
                                setAnchorEl(null)
                            }}
                            title={color.name}
                        >
                            {!color.value && <MdClose size={12} />}
                        </button>
                    ))}
                </div>
            </Popover>
        </>
    )
}

export default function NoteBook({noteEntries, noteId}: {noteEntries: Entry[] | undefined, noteId: string}) {

    const { scrollY } = useScroll()

    // Original content for comparison
    const originalContent = noteEntries?.[0]?.item || ''

    const [editorContent, setEditorContent] = useState(originalContent)
    const [isButtonVisible, setIsButtonVisible] = useState<boolean>(true)
    const [openSuccess, setOpenSuccess] = useState<boolean>(false)
    const [openError, setOpenError] = useState<boolean>(false)

    // Force re-render on selection/transaction changes for toolbar active states
    const [, setForceUpdate] = useState(0)

    // Link popover state
    const [linkPopoverAnchor, setLinkPopoverAnchor] = useState<HTMLButtonElement | null>(null)
    const [linkUrl, setLinkUrl] = useState('')
    const [linkText, setLinkText] = useState('')

    // Image/YouTube URL input
    const [mediaPopoverAnchor, setMediaPopoverAnchor] = useState<HTMLButtonElement | null>(null)
    const [mediaType, setMediaType] = useState<'image' | 'youtube'>('image')
    const [mediaUrl, setMediaUrl] = useState('')

    // Table menu
    const [tableMenuAnchor, setTableMenuAnchor] = useState<HTMLButtonElement | null>(null)

    const saveNoteButtonRef = useRef<HTMLDivElement>(null)

    // Text statistics
    const textStats = getTextStats(editorContent)

    // Initialize TipTap editor with module-level extensions (prevents duplicates in StrictMode)
    const editor = useEditor({
        extensions: EDITOR_EXTENSIONS,
        content: originalContent,
        editorProps: {
            attributes: {
                class: styles.tiptapEditor,
            },
        },
        onUpdate: ({ editor }) => {
            const html = editor.getHTML()
            setEditorContent(html)
        },
        onTransaction: () => {
            setForceUpdate(n => n + 1)
        },
        immediatelyRender: false,
    })

    // Detect platform for shortcut display
    const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac')
    const modKey = isMac ? '⌘' : 'Ctrl+'

    // Link handlers
    const openLinkPopover = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        if (!editor) return

        const { from, to } = editor.state.selection
        const selectedText = editor.state.doc.textBetween(from, to, '')
        const existingUrl = editor.getAttributes('customLink').href || ''

        setLinkText(selectedText)
        setLinkUrl(existingUrl)
        setLinkPopoverAnchor(e.currentTarget)
    }, [editor])

    const handleLinkSubmit = useCallback(() => {
        if (!editor) return

        const url = ensureProtocol(linkUrl.trim())

        if (!url) {
            editor.chain().focus().extendMarkRange('customLink').unsetLink().run()
        } else {
            const { from, to } = editor.state.selection
            const hasSelection = from !== to

            if (hasSelection) {
                editor.chain().focus().setLink({ href: url }).run()
            } else if (linkText) {
                editor
                    .chain()
                    .focus()
                    .insertContent(`<a href="${url}" target="_blank" rel="noopener noreferrer">${linkText}</a>`)
                    .run()
            } else {
                editor
                    .chain()
                    .focus()
                    .insertContent(`<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`)
                    .run()
            }
        }

        setLinkPopoverAnchor(null)
        setLinkUrl('')
        setLinkText('')
    }, [editor, linkUrl, linkText])

    const removeLink = useCallback(() => {
        if (!editor) return
        editor.chain().focus().extendMarkRange('customLink').unsetLink().run()
        setLinkPopoverAnchor(null)
    }, [editor])

    // Media (image/youtube) handlers
    const openMediaPopover = useCallback((type: 'image' | 'youtube', e: React.MouseEvent<HTMLButtonElement>) => {
        setMediaType(type)
        setMediaUrl('')
        setMediaPopoverAnchor(e.currentTarget)
    }, [])

    const handleMediaSubmit = useCallback(() => {
        if (!editor || !mediaUrl.trim()) return

        if (mediaType === 'image') {
            editor.chain().focus().setImage({ src: mediaUrl.trim() }).run()
        } else {
            editor.chain().focus().setYoutubeVideo({ src: mediaUrl.trim() }).run()
        }

        setMediaPopoverAnchor(null)
        setMediaUrl('')
    }, [editor, mediaType, mediaUrl])

    // Table handlers
    const openTableMenu = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        setTableMenuAnchor(e.currentTarget)
    }, [])

    const insertTable = useCallback(() => {
        if (!editor) return
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        setTableMenuAnchor(null)
    }, [editor])

    const deleteTable = useCallback(() => {
        if (!editor) return
        editor.chain().focus().deleteTable().run()
        setTableMenuAnchor(null)
    }, [editor])

    const addColumnAfter = useCallback(() => {
        if (!editor) return
        editor.chain().focus().addColumnAfter().run()
    }, [editor])

    const addRowAfter = useCallback(() => {
        if (!editor) return
        editor.chain().focus().addRowAfter().run()
    }, [editor])

    const deleteColumn = useCallback(() => {
        if (!editor) return
        editor.chain().focus().deleteColumn().run()
    }, [editor])

    const deleteRow = useCallback(() => {
        if (!editor) return
        editor.chain().focus().deleteRow().run()
    }, [editor])

    // Save function for auto-save hook
    const performSave = useCallback(async (content: string): Promise<boolean> => {
        try {
            if (noteEntries && noteEntries?.length > 0) {
                noteEntries[0].item = content
            }

            const response = await fetch('/api/save-notebook', {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    noteId,
                    itemName: content,
                    entryId: noteEntries?.[0]?.entryId
                }),
                cache: "no-cache",
            })

            if (!response.ok) {
                console.error('Save failed with status:', response.status)
                return false
            }

            const data = await response.json()
            return data.message === "success"
        } catch (error) {
            console.error('Save error:', error)
            return false
        }
    }, [noteId, noteEntries])

    // Auto-save hook
    const {
        saveStatus,
        hasChanges,
        lastSaved,
        save: triggerSave,
        isSaving
    } = useAutoSave(editorContent, originalContent, {
        onSave: performSave,
        delay: 2400,
        enabled: true
    })

    // Scroll visibility tracking
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
        return () => scrollY.clearListeners()
    }, [scrollY, isButtonVisible])

    // Manual save handler
    const handleManualSave = useCallback(async () => {
        if (!hasChanges) return

        const success = await triggerSave()
        if (success) {
            setOpenSuccess(true)
        } else {
            setOpenError(true)
        }
    }, [hasChanges, triggerSave])

    // Keyboard shortcut (Ctrl/Cmd + S) for save
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault()
                if (hasChanges && !isSaving) {
                    handleManualSave()
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [hasChanges, isSaving, handleManualSave])

    if (!editor) {
        return (
            <div className={styles.notebookSkeleton}>
                {/* Skeleton Header */}
                <div className={styles.skeletonHeader}>
                    <div className={styles.skeletonHeaderLeft}>
                        <div className={styles.skeletonText} style={{ width: '10em' }} />
                        <div className={styles.skeletonText} style={{ width: '6em' }} />
                    </div>
                    <div className={styles.skeletonText} style={{ width: '8em' }} />
                </div>

                {/* Skeleton Toolbar */}
                <div className={styles.skeletonToolbar}>
                    <div className={styles.skeletonToolbarGroup}>
                        <div className={styles.skeletonButton} />
                        <div className={styles.skeletonButton} />
                    </div>
                    <div className={styles.skeletonToolbarGroup}>
                        <div className={styles.skeletonButton} />
                        <div className={styles.skeletonButton} />
                        <div className={styles.skeletonButton} />
                        <div className={styles.skeletonButton} />
                    </div>
                    <div className={styles.skeletonToolbarGroup}>
                        <div className={styles.skeletonButton} />
                        <div className={styles.skeletonButton} />
                    </div>
                    <div className={styles.skeletonToolbarGroup}>
                        <div className={styles.skeletonButton} />
                        <div className={styles.skeletonButton} />
                        <div className={styles.skeletonButton} />
                    </div>
                </div>

                {/* Skeleton Editor */}
                <div className={styles.skeletonEditor}>
                    <div className={`${styles.skeletonLine} ${styles.skeletonLineMedium}`} />
                    <div className={`${styles.skeletonLine} ${styles.skeletonLineLong}`} />
                    <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
                    <div className={`${styles.skeletonLine} ${styles.skeletonLineLong}`} />
                    <div className={`${styles.skeletonLine} ${styles.skeletonLineMedium}`} />
                    <div style={{ height: '1.5em' }} />
                    <div className={`${styles.skeletonLine} ${styles.skeletonLineLong}`} />
                    <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
                    <div className={`${styles.skeletonLine} ${styles.skeletonLineMedium}`} />
                </div>
            </div>
        )
    }

    const isInTable = editor.isActive('table')

    return (
        <>
            {/* Header Section */}
            <div className={styles.notebookHeader}>
                <div className={styles.notebookMetadata}>
                    {noteEntries?.[0]?.lastEdit && (
                        <span className={styles.lastUpdated}>
                            Last Updated: {formatDate(noteEntries?.[0]?.lastEdit)}
                        </span>
                    )}
                    <SaveStatusIndicator status={saveStatus} lastSaved={lastSaved} />
                </div>

                <div className={styles.textStats}>
                    <span>{textStats.wordCount} words</span>
                    <span className={styles.statDivider}>|</span>
                    <span>{textStats.charCount} chars</span>
                </div>
            </div>

            {/* Main Formatting Toolbar */}
            <div className={styles.toolbar}>
                {/* Undo/Redo */}
                <div className={styles.toolbarGroup}>
                    <ToolbarButton
                        icon={<MdUndo />}
                        tooltip="Undo"
                        onClick={() => editor.chain().focus().undo().run()}
                        shortcut={`${modKey}Z`}
                        disabled={!editor.can().undo()}
                    />
                    <ToolbarButton
                        icon={<MdRedo />}
                        tooltip="Redo"
                        onClick={() => editor.chain().focus().redo().run()}
                        shortcut={isMac ? `${modKey}Shift+Z` : `${modKey}Y`}
                        disabled={!editor.can().redo()}
                    />
                </div>

                <Divider orientation="vertical" flexItem className={styles.toolbarDivider} />

                {/* Text Formatting */}
                <div className={styles.toolbarGroup}>
                    <ToolbarButton
                        icon={<MdFormatBold />}
                        tooltip="Bold"
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        shortcut={`${modKey}B`}
                        isActive={editor.isActive('bold')}
                    />
                    <ToolbarButton
                        icon={<MdFormatItalic />}
                        tooltip="Italic"
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        shortcut={`${modKey}I`}
                        isActive={editor.isActive('italic')}
                    />
                    <ToolbarButton
                        icon={<MdFormatUnderlined />}
                        tooltip="Underline"
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        shortcut={`${modKey}U`}
                        isActive={editor.isActive('customUnderline')}
                    />
                    <ToolbarButton
                        icon={<MdFormatStrikethrough />}
                        tooltip="Strikethrough"
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                        isActive={editor.isActive('strike')}
                    />
                </div>

                <Divider orientation="vertical" flexItem className={styles.toolbarDivider} />

                {/* Colors */}
                <div className={styles.toolbarGroup}>
                    <ColorPicker
                        colors={TEXT_COLORS}
                        currentColor={editor.getAttributes('textStyle').color}
                        onSelect={(color) => {
                            if (color) {
                                editor.chain().focus().setColor(color).run()
                            } else {
                                editor.chain().focus().unsetColor().run()
                            }
                        }}
                        icon={<MdFormatColorText />}
                        tooltip="Text Color"
                    />
                    <ColorPicker
                        colors={COLORS}
                        currentColor={editor.getAttributes('highlight').color}
                        onSelect={(color) => {
                            if (color) {
                                editor.chain().focus().toggleHighlight({ color }).run()
                            } else {
                                editor.chain().focus().unsetHighlight().run()
                            }
                        }}
                        icon={<MdHighlight />}
                        tooltip="Highlight"
                    />
                </div>

                <Divider orientation="vertical" flexItem className={styles.toolbarDivider} />

                {/* Headings & Blocks */}
                <div className={styles.toolbarGroup}>
                    <ToolbarButton
                        icon={<MdTitle />}
                        tooltip="Heading"
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        isActive={editor.isActive('heading')}
                    />
                    <ToolbarButton
                        icon={<MdFormatQuote />}
                        tooltip="Quote"
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                        isActive={editor.isActive('blockquote')}
                    />
                    <ToolbarButton
                        icon={<MdCode />}
                        tooltip="Code Block"
                        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                        isActive={editor.isActive('codeBlock')}
                    />
                </div>

                <Divider orientation="vertical" flexItem className={styles.toolbarDivider} />

                {/* Lists */}
                <div className={styles.toolbarGroup}>
                    <ToolbarButton
                        icon={<MdFormatListBulleted />}
                        tooltip="Bullet List"
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        isActive={editor.isActive('bulletList')}
                    />
                    <ToolbarButton
                        icon={<MdFormatListNumbered />}
                        tooltip="Numbered List"
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        isActive={editor.isActive('orderedList')}
                    />
                    <ToolbarButton
                        icon={<MdCheckBox />}
                        tooltip="Task List"
                        onClick={() => editor.chain().focus().toggleTaskList().run()}
                        isActive={editor.isActive('taskList')}
                    />
                </div>

                <Divider orientation="vertical" flexItem className={styles.toolbarDivider} />

                {/* Alignment */}
                <div className={styles.toolbarGroup}>
                    <ToolbarButton
                        icon={<MdFormatAlignLeft />}
                        tooltip="Align Left"
                        onClick={() => editor.chain().focus().setTextAlign('left').run()}
                        isActive={editor.isActive({ textAlign: 'left' })}
                    />
                    <ToolbarButton
                        icon={<MdFormatAlignCenter />}
                        tooltip="Align Center"
                        onClick={() => editor.chain().focus().setTextAlign('center').run()}
                        isActive={editor.isActive({ textAlign: 'center' })}
                    />
                    <ToolbarButton
                        icon={<MdFormatAlignRight />}
                        tooltip="Align Right"
                        onClick={() => editor.chain().focus().setTextAlign('right').run()}
                        isActive={editor.isActive({ textAlign: 'right' })}
                    />
                </div>

                <Divider orientation="vertical" flexItem className={styles.toolbarDivider} />

                {/* Insert Items */}
                <div className={styles.toolbarGroup}>
                    <ToolbarButton
                        icon={<MdLink />}
                        tooltip="Insert Link"
                        onClick={openLinkPopover}
                        isActive={editor.isActive('customLink')}
                    />
                    <ToolbarButton
                        icon={<MdImage />}
                        tooltip="Insert Image"
                        onClick={(e) => openMediaPopover('image', e)}
                    />
                    <ToolbarButton
                        icon={<MdVideoLibrary />}
                        tooltip="Insert YouTube Video"
                        onClick={(e) => openMediaPopover('youtube', e)}
                    />
                    <ToolbarButton
                        icon={<MdTableChart />}
                        tooltip="Table"
                        onClick={openTableMenu}
                        isActive={isInTable}
                    />
                    <ToolbarButton
                        icon={<MdHorizontalRule />}
                        tooltip="Horizontal Rule"
                        onClick={() => editor.chain().focus().setHorizontalRule().run()}
                    />
                </div>

                {/* Save button */}
                <div className={styles.toolbarSpacer} />
                <div
                    onClick={handleManualSave}
                    className={`${styles.toolbarSaveButton} ${hasChanges ? styles.toolbarSaveButtonActive : ''}`}
                    ref={saveNoteButtonRef}
                >
                    {isSaving ? (
                        <CircularProgress
                            sx={{width: "1em !important", height: "1em !important"}}
                            className={styles.backDropLoader}
                        />
                    ) : (
                        <AiFillSave />
                    )}
                    <span className={styles.saveButtonText}>Save</span>
                </div>
            </div>

            {/* Link Popover */}
            <Popover
                open={Boolean(linkPopoverAnchor)}
                anchorEl={linkPopoverAnchor}
                onClose={() => setLinkPopoverAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                slotProps={{
                    paper: {
                        className: styles.popoverPaper
                    }
                }}
            >
                <div className={styles.popoverContent}>
                    <div className={styles.popoverHeader}>
                        <span className={styles.popoverTitle}>Insert Link</span>
                        <IconButton size="small" onClick={() => setLinkPopoverAnchor(null)}>
                            <MdClose />
                        </IconButton>
                    </div>
                    <TextField
                        size="small"
                        label="Link Text"
                        value={linkText}
                        onChange={(e) => setLinkText(e.target.value)}
                        fullWidth
                        placeholder="Text to display"
                        className={styles.popoverInput}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                color: 'var(--primary-color)',
                                '& fieldset': { borderColor: 'var(--borders-color)' },
                                '&:hover fieldset': { borderColor: 'var(--secondary-color)' },
                                '&.Mui-focused fieldset': { borderColor: 'var(--secondary-color)' },
                            },
                            '& .MuiInputLabel-root': { color: 'var(--primary-color)', opacity: 0.7 },
                        }}
                    />
                    <TextField
                        size="small"
                        label="URL"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        fullWidth
                        placeholder="https://example.com"
                        className={styles.popoverInput}
                        onKeyDown={(e) => e.key === 'Enter' && handleLinkSubmit()}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                color: 'var(--primary-color)',
                                '& fieldset': { borderColor: 'var(--borders-color)' },
                                '&:hover fieldset': { borderColor: 'var(--secondary-color)' },
                                '&.Mui-focused fieldset': { borderColor: 'var(--secondary-color)' },
                            },
                            '& .MuiInputLabel-root': { color: 'var(--primary-color)', opacity: 0.7 },
                        }}
                    />
                    <div className={styles.popoverActions}>
                        {editor.isActive('customLink') && (
                            <Button
                                size="small"
                                color="error"
                                onClick={removeLink}
                                startIcon={<MdDeleteOutline />}
                                sx={{ textTransform: 'none' }}
                            >
                                Remove Link
                            </Button>
                        )}
                        <Button
                            size="small"
                            variant="contained"
                            onClick={handleLinkSubmit}
                            sx={{
                                backgroundColor: 'var(--secondary-color)',
                                textTransform: 'none',
                                '&:hover': { backgroundColor: 'var(--secondary-color)', opacity: 0.9 }
                            }}
                        >
                            {editor.isActive('customLink') ? 'Update Link' : 'Insert Link'}
                        </Button>
                    </div>
                </div>
            </Popover>

            {/* Media (Image/YouTube) Popover */}
            <Popover
                open={Boolean(mediaPopoverAnchor)}
                anchorEl={mediaPopoverAnchor}
                onClose={() => setMediaPopoverAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                slotProps={{
                    paper: {
                        className: styles.popoverPaper
                    }
                }}
            >
                <div className={styles.popoverContent}>
                    <div className={styles.popoverHeader}>
                        <span className={styles.popoverTitle}>
                            {mediaType === 'image' ? 'Insert Image' : 'Insert YouTube Video'}
                        </span>
                        <IconButton size="small" onClick={() => setMediaPopoverAnchor(null)}>
                            <MdClose />
                        </IconButton>
                    </div>
                    <TextField
                        size="small"
                        label={mediaType === 'image' ? 'Image URL' : 'YouTube URL'}
                        value={mediaUrl}
                        onChange={(e) => setMediaUrl(e.target.value)}
                        fullWidth
                        placeholder={mediaType === 'image' ? 'https://example.com/image.jpg' : 'https://youtube.com/watch?v=...'}
                        className={styles.popoverInput}
                        onKeyDown={(e) => e.key === 'Enter' && handleMediaSubmit()}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                color: 'var(--primary-color)',
                                '& fieldset': { borderColor: 'var(--borders-color)' },
                                '&:hover fieldset': { borderColor: 'var(--secondary-color)' },
                                '&.Mui-focused fieldset': { borderColor: 'var(--secondary-color)' },
                            },
                            '& .MuiInputLabel-root': { color: 'var(--primary-color)', opacity: 0.7 },
                        }}
                    />
                    <div className={styles.popoverActions}>
                        <Button
                            size="small"
                            variant="contained"
                            onClick={handleMediaSubmit}
                            disabled={!mediaUrl.trim()}
                            sx={{
                                backgroundColor: 'var(--secondary-color)',
                                textTransform: 'none',
                                '&:hover': { backgroundColor: 'var(--secondary-color)', opacity: 0.9 }
                            }}
                        >
                            Insert {mediaType === 'image' ? 'Image' : 'Video'}
                        </Button>
                    </div>
                </div>
            </Popover>

            {/* Table Menu Popover */}
            <Popover
                open={Boolean(tableMenuAnchor)}
                anchorEl={tableMenuAnchor}
                onClose={() => setTableMenuAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                slotProps={{
                    paper: {
                        className: styles.popoverPaper
                    }
                }}
            >
                <div className={styles.popoverContent}>
                    <div className={styles.popoverHeader}>
                        <span className={styles.popoverTitle}>Table</span>
                        <IconButton size="small" onClick={() => setTableMenuAnchor(null)}>
                            <MdClose />
                        </IconButton>
                    </div>
                    <div className={styles.tableMenuGrid}>
                        {!isInTable ? (
                            <Button
                                fullWidth
                                variant="outlined"
                                startIcon={<MdAddBox />}
                                onClick={insertTable}
                                sx={{
                                    justifyContent: 'flex-start',
                                    color: 'var(--primary-color)',
                                    borderColor: 'var(--borders-color)',
                                    textTransform: 'none',
                                    '&:hover': { borderColor: 'var(--secondary-color)', color: 'var(--secondary-color)' }
                                }}
                            >
                                Insert New Table (3x3)
                            </Button>
                        ) : (
                            <>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<MdAddBox />}
                                    onClick={() => { addColumnAfter(); setTableMenuAnchor(null); }}
                                    sx={{
                                        justifyContent: 'flex-start',
                                        color: 'var(--primary-color)',
                                        borderColor: 'var(--borders-color)',
                                        textTransform: 'none',
                                        '&:hover': { borderColor: 'var(--secondary-color)', color: 'var(--secondary-color)' }
                                    }}
                                >
                                    Add Column
                                </Button>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<MdAddBox />}
                                    onClick={() => { addRowAfter(); setTableMenuAnchor(null); }}
                                    sx={{
                                        justifyContent: 'flex-start',
                                        color: 'var(--primary-color)',
                                        borderColor: 'var(--borders-color)',
                                        textTransform: 'none',
                                        '&:hover': { borderColor: 'var(--secondary-color)', color: 'var(--secondary-color)' }
                                    }}
                                >
                                    Add Row
                                </Button>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<MdDeleteOutline />}
                                    onClick={() => { deleteColumn(); setTableMenuAnchor(null); }}
                                    sx={{
                                        justifyContent: 'flex-start',
                                        color: 'var(--primary-color)',
                                        borderColor: 'var(--borders-color)',
                                        textTransform: 'none',
                                        '&:hover': { borderColor: '#ef4444', color: '#ef4444' }
                                    }}
                                >
                                    Delete Column
                                </Button>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<MdDeleteOutline />}
                                    onClick={() => { deleteRow(); setTableMenuAnchor(null); }}
                                    sx={{
                                        justifyContent: 'flex-start',
                                        color: 'var(--primary-color)',
                                        borderColor: 'var(--borders-color)',
                                        textTransform: 'none',
                                        '&:hover': { borderColor: '#ef4444', color: '#ef4444' }
                                    }}
                                >
                                    Delete Row
                                </Button>
                                <Divider sx={{ my: 1 }} />
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    color="error"
                                    startIcon={<MdDeleteOutline />}
                                    onClick={deleteTable}
                                    sx={{
                                        justifyContent: 'flex-start',
                                        textTransform: 'none',
                                    }}
                                >
                                    Delete Entire Table
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </Popover>

            {/* TipTap Editor */}
            <div className={styles.editorContainer}>
                <EditorContent editor={editor} />

                {/* Unsaved indicator overlay */}
                <AnimatePresence>
                    {hasChanges && (
                        <MotionWrap
                            className={styles.unsavedIndicator}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.2 }}
                        >
                            <MdEdit className={styles.unsavedIcon} />
                        </MotionWrap>
                    )}
                </AnimatePresence>
            </div>

            {/* Floating Save Button */}
            <AnimatePresence>
                {!isButtonVisible && (
                    <MotionWrap
                        className={`${styles.floatingSaveButton} ${hasChanges ? styles.floatingSaveButtonActive : ''}`}
                        onClick={handleManualSave}
                        initial={{scale: 0.5, y: 100, opacity: 0}}
                        animate={{scale: 1, y: 0, opacity: 1}}
                        exit={{scale: 0.5, y: 100, opacity: 0}}
                        transition={{duration: 0.4, type: "spring", stiffness: 300, damping: 25}}
                    >
                        {isSaving ? (
                            <CircularProgress
                                sx={{width: "1.2em !important", height: "1.2em !important", color: "white !important"}}
                            />
                        ) : (
                            <>
                                <AiFillSave style={{height: "1.2em", width: "1.2em"}} />
                                {hasChanges && <span className={styles.unsavedDot} />}
                            </>
                        )}
                    </MotionWrap>
                )}
            </AnimatePresence>

            {/* Success Snackbar */}
            <Snackbar
                open={openSuccess}
                autoHideDuration={2500}
                onClose={() => setOpenSuccess(false)}
                anchorOrigin={{horizontal: "center", vertical: "bottom"}}
            >
                <Alert onClose={() => setOpenSuccess(false)} severity="success" sx={{ width: '100%' }}>
                    Notebook saved successfully!
                </Alert>
            </Snackbar>

            {/* Error Snackbar */}
            <Snackbar
                open={openError}
                autoHideDuration={2500}
                onClose={() => setOpenError(false)}
                anchorOrigin={{horizontal: "center", vertical: "bottom"}}
            >
                <Alert onClose={() => setOpenError(false)} severity="error" sx={{ width: '100%' }}>
                    Error saving notebook. Please try again.
                </Alert>
            </Snackbar>
        </>
    )
}
