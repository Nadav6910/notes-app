'use client'

import { memo, useState } from 'react'
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Checkbox,
  IconButton,
  Box
} from '@mui/material'
import { MdDelete, MdModeEditOutline, MdCheckCircle } from 'react-icons/md'
import { formatDate } from "@/lib/utils"
import { Entry } from "../../../types"
import styles from "../../app/my-notes/note/[noteId]/styles/notePage.module.css"
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion'

interface NoteListItemProps {
  entry: Entry
  index: number
  totalItems: number
  onToggle: (isChecked: boolean | null | undefined, entryId: string) => void
  onRename: (entryId: string, name: string, priority: string | undefined | null, category: string | undefined | null) => void
  onDelete: (entryId: string, name: string) => void
}

const NoteListItem = memo(function NoteListItem({
  entry,
  index,
  totalItems,
  onToggle,
  onRename,
  onDelete
}: NoteListItemProps) {
  const labelId = `checkbox-list-label-${entry.entryId}`
  const entryPriority = entry.priority

  // Swipe gesture state
  const x = useMotionValue(0)
  const [swipeAction, setSwipeAction] = useState<'complete' | 'delete' | null>(null)

  const background = useTransform(
    x,
    [-150, -75, 0, 75, 150],
    ['#ef4444', '#ef444466', 'rgba(0, 0, 0, 0)', '#4caf5066', '#4caf50']
  )

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -100) {
      // Swipe left to delete
      onDelete(entry.entryId, entry.item)
    } else if (info.offset.x > 100) {
      // Swipe right to complete
      onToggle(entry?.isChecked, entry.entryId)
    }
    x.set(0)
  }

  // Priority colors for glow effect
  const getPriorityStyles = (): { color?: string; shadow?: string } => {
    if (!entry.priority || entry.priority === 'none') return {}

    const colors = {
      red: { color: '#ef4444', shadow: '0 0 12px rgba(239, 68, 68, 0.5)' },
      yellow: { color: '#f59e0b', shadow: '0 0 12px rgba(245, 158, 11, 0.5)' },
      green: { color: '#22c55e', shadow: '0 0 12px rgba(34, 197, 94, 0.5)' }
    }

    return colors[entry.priority as keyof typeof colors] || {}
  }

  const priorityStyle = getPriorityStyles()

  return (
    <motion.div
      style={{
        position: 'relative',
        overflow: 'hidden',
        background
      }}
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{
        delay: index * 0.05,
        type: "spring",
        stiffness: 300,
        damping: 24
      }}
    >
      {/* Priority glow indicator on left edge */}
      {entry.priority && entry.priority !== 'none' && (
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            bgcolor: priorityStyle.color,
            boxShadow: priorityStyle.shadow,
            borderRadius: '0 4px 4px 0',
            zIndex: 1
          }}
        />
      )}

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ x }}
      >
        <ListItem
          className={`${index === 0 ? styles.firstItem : index === totalItems - 1 ? styles.lastItem : ''} ${index % 2 === 0 ? styles.noteListItem : styles.noteListItemOdd}`}
          disablePadding
          secondaryAction={
            <div style={{ display: "flex", gap: "1em" }}>
              <IconButton onClick={() => onRename(entry.entryId, entry.item, entry?.priority, entry?.category)} className={styles.iconButtonRename} edge="end" aria-label="edit">
                <MdModeEditOutline className={styles.iconRename} />
              </IconButton>
              <IconButton onClick={() => onDelete(entry.entryId, entry.item)} className={styles.iconButtonDelete} edge="end" aria-label="delete">
                <MdDelete className={styles.iconDelete} />
              </IconButton>
            </div>
          }
        >
          <ListItemButton onClick={() => onToggle(entry?.isChecked, entry.entryId)} dense>
            <ListItemIcon sx={{ minWidth: "2em" }}>
              <motion.div
                animate={{
                  scale: entry?.isChecked ? [1, 1.3, 1] : 1,
                  rotate: entry?.isChecked ? [0, 10, -10, 0] : 0
                }}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 15,
                  duration: 0.3
                }}
              >
                <Checkbox
                  className={styles.noteListCheckbox}
                  edge="start"
                  checked={entry?.isChecked ?? false}
                  tabIndex={-1}
                  disableRipple
                  inputProps={{ 'aria-labelledby': labelId }}
                  icon={<Box component="span" sx={{
                    width: 20,
                    height: 20,
                    border: '2px solid',
                    borderColor: 'var(--borders-color)',
                    borderRadius: '4px',
                    transition: 'all 0.2s ease'
                  }} />}
                  checkedIcon={<MdCheckCircle style={{ fontSize: 24, color: '#4caf50' }} />}
                />
              </motion.div>
            </ListItemIcon>
            <div style={{ flex: 1 }}>
              <motion.div
                animate={{
                  opacity: entry?.isChecked ? 0.6 : 1
                }}
                transition={{ duration: 0.3 }}
              >
                <ListItemText
                  className={styles.noteListItemText}
                  sx={{
                    paddingRight: "3em",
                    lineBreak: "anywhere",
                    '& .MuiTypography-root': {
                      position: 'relative',
                      '&::after': entry?.isChecked ? {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        top: '50%',
                        width: '100%',
                        height: '2px',
                        background: 'var(--primary-color)',
                        animation: 'strikethrough 0.3s ease-out forwards',
                        transformOrigin: 'left',
                        '@keyframes strikethrough': {
                          from: {
                            transform: 'scaleX(0)'
                          },
                          to: {
                            transform: 'scaleX(1)'
                          }
                        }
                      } : {}
                    }
                  }}
                  id={labelId}
                  primary={entry.item}
                />
              </motion.div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5em" }}>
                <ListItemText className={styles.itemCreatedAt}>
                  {formatDate(entry.createdAt)}
                </ListItemText>
              </div>
            </div>
          </ListItemButton>
        </ListItem>
      </motion.div>
    </motion.div>
  )
})

export default NoteListItem
