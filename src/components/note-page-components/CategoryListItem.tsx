'use client'

import { memo, useMemo } from 'react'
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Box
} from '@mui/material'
import { MdDelete, MdModeEditOutline } from 'react-icons/md'
import { FaTrash, FaCheck } from 'react-icons/fa'
import { formatDate } from "@/lib/utils"
import { Entry } from "../../../types"
import AnimatedCheckbox from "./AnimatedCheckbox"
import styles from "../../app/my-notes/note/[noteId]/styles/notePage.module.css"
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion'

interface CategoryListItemProps {
  entry: Entry
  index: number
  totalItems: number
  category: string
  onToggle: (isChecked: boolean | null | undefined, entryId: string, category: string) => void
  onRename: (entryId: string, name: string, priority: string | undefined | null, category: string | undefined | null) => void
  onDelete: (entryId: string, name: string) => void
  resolvedTheme: string | undefined
}

const CategoryListItem = memo(function CategoryListItem({
  entry,
  index,
  totalItems,
  category,
  onToggle,
  onRename,
  onDelete,
  resolvedTheme
}: CategoryListItemProps) {
  const labelId = `checkbox-list-label-${entry.entryId}`
  const entryPriority = entry.priority

  // Swipe gesture state
  const x = useMotionValue(0)

  // Swipe threshold - lowered for easier activation
  const SWIPE_THRESHOLD = 75

  const background = useTransform(
    x,
    [-150, -75, 0, 75, 150],
    ['#ef4444', '#ef444466', 'rgba(0, 0, 0, 0)', '#4caf5066', '#4caf50']
  )

  // Transform for swipe action icons
  const deleteIconOpacity = useTransform(x, [-150, -50, 0], [1, 0.5, 0])
  const deleteIconScale = useTransform(x, [-150, -75, 0], [1.2, 1, 0.5])
  const checkIconOpacity = useTransform(x, [0, 50, 150], [0, 0.5, 1])
  const checkIconScale = useTransform(x, [0, 75, 150], [0.5, 1, 1.2])

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -SWIPE_THRESHOLD) {
      // Swipe left to delete
      onDelete(entry.entryId, entry.item)
    } else if (info.offset.x > SWIPE_THRESHOLD) {
      // Swipe right to complete
      onToggle(entry?.isChecked, entry.entryId, category)
    }
  }

  // Memoize priority styles to avoid recalculation on every render
  const priorityStyle = useMemo(() => {
    if (!entry.priority || entry.priority === 'none') return null

    const colors = {
      red: { color: '#ef4444', shadow: '0 0 12px rgba(239, 68, 68, 0.5)' },
      yellow: { color: '#f59e0b', shadow: '0 0 12px rgba(245, 158, 11, 0.5)' },
      green: { color: '#22c55e', shadow: '0 0 12px rgba(34, 197, 94, 0.5)' }
    }

    return colors[entry.priority as keyof typeof colors] || null
  }, [entry.priority])

  // Memoize icon container styles
  const iconContainerStyle = useMemo(() => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: '50%'
  }), [])

  // Memoize flex container style
  const flexContainerStyle = useMemo(() => ({ flex: 1 }), [])
  const dateContainerStyle = useMemo(() => ({ display: "flex", alignItems: "center", gap: "0.5em" }), [])
  const actionButtonsStyle = useMemo(() => ({ display: "flex", gap: "1em" }), [])

  return (
    <motion.div
      style={{
        position: 'relative',
        overflow: 'hidden',
        background,
        contain: 'layout style paint'
      }}
    >
      {/* Swipe action indicator - Delete (left swipe) */}
      <motion.div
        style={{
          position: 'absolute',
          right: 20,
          top: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: deleteIconOpacity,
          scale: deleteIconScale,
          zIndex: 0,
          pointerEvents: 'none'
        }}
      >
        <Box sx={{ ...iconContainerStyle, bgcolor: '#ef444420' }}>
          <FaTrash style={{ fontSize: '1.1rem', color: '#ef4444' }} />
        </Box>
      </motion.div>

      {/* Swipe action indicator - Complete (right swipe) */}
      <motion.div
        style={{
          position: 'absolute',
          left: 20,
          top: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: checkIconOpacity,
          scale: checkIconScale,
          zIndex: 0,
          pointerEvents: 'none'
        }}
      >
        <Box sx={{ ...iconContainerStyle, bgcolor: '#4caf5020' }}>
          <FaCheck style={{ fontSize: '1.1rem', color: '#4caf50' }} />
        </Box>
      </motion.div>

      {/* Priority glow indicator on left edge */}
      {priorityStyle && (
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
            zIndex: 2
          }}
        />
      )}

      <motion.div
        drag="x"
        dragConstraints={{ left: -150, right: 150 }}
        dragElastic={0.1}
        dragSnapToOrigin
        onDragEnd={handleDragEnd}
        style={{ x, position: 'relative', zIndex: 1 }}
      >
        <ListItem
          style={{ borderRadius: "unset" }}
          className={`${index === 0 ? styles.firstItem : index === totalItems - 1 ? styles.lastItem : ''} ${index % 2 === 0 ? styles.noteListItem : styles.noteListItemOdd}`}
          disablePadding
          secondaryAction={
            <div style={actionButtonsStyle}>
              <IconButton onClick={() => onRename(entry.entryId, entry.item, entry?.priority, entry?.category)} className={styles.iconButtonRename} edge="end" aria-label="edit">
                <MdModeEditOutline className={styles.iconRename} />
              </IconButton>
              <IconButton onClick={() => onDelete(entry.entryId, entry.item)} className={styles.iconButtonDelete} edge="end" aria-label="delete">
                <MdDelete className={styles.iconDelete} />
              </IconButton>
            </div>
          }
        >
          <ListItemButton onClick={() => onToggle(entry?.isChecked, entry.entryId, category)} dense>
            <ListItemIcon sx={{ minWidth: "2em" }}>
              <AnimatedCheckbox
                className={styles.noteListCheckbox}
                edge="start"
                checked={entry?.isChecked ?? false}
                tabIndex={-1}
                disableRipple
                inputProps={{ 'aria-labelledby': labelId }}
                theme={resolvedTheme}
              />
            </ListItemIcon>
            <div style={flexContainerStyle}>
              <ListItemText
                className={styles.noteListItemText}
                sx={{ paddingRight: "3em", lineBreak: "anywhere" }}
                id={labelId}
                primary={
                  <span className={`${styles.textWrapper} ${entry?.isChecked ? styles.lineActive : ''}`}>
                    {entry.item}
                  </span>
                }
              />
              <div style={dateContainerStyle}>
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

export default CategoryListItem
