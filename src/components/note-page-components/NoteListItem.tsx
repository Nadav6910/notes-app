'use client'

import { memo } from 'react'
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Checkbox,
  IconButton
} from '@mui/material'
import { MdDelete, MdModeEditOutline } from 'react-icons/md'
import { formatDate } from "@/lib/utils"
import { Entry } from "../../../types"
import styles from "../../app/my-notes/note/[noteId]/styles/notePage.module.css"

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

  return (
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
  )
})

export default NoteListItem
