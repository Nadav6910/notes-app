'use client'

import styles from "../../app/my-notes/note/[noteId]/styles/notePage.module.css"
import { useState } from 'react';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import { MdDelete } from 'react-icons/md'
import { MdModeEditOutline } from 'react-icons/md'

export default function NoteItemsList() {

  const [checked, setChecked] = useState([0])

  const handleToggle = (value: number) => () => {

    const currentIndex = checked.indexOf(value)
    const newChecked = [...checked]

    if (currentIndex === -1) {
      newChecked.push(value)
    } 
    
    else {
      newChecked.splice(currentIndex, 1)
    }

    setChecked(newChecked)
  }

  return (
    <List className={styles.noteListContainer} sx={{ width: '100%' }}>
      {[0, 1, 2, 3].map((value, index) => {
        const labelId = `checkbox-list-label-${value}`

        return (
          <ListItem
            key={value}
            className={index % 2 === 0 ? styles.noteListItem : styles.noteListItemOdd}
            disablePadding
            secondaryAction={
                <div style={{display: "flex", gap: "1em"}}>
                <IconButton className={styles.iconButtonRename} edge="end" aria-label="comments">
                  <MdModeEditOutline className={styles.iconRename} />
                </IconButton>

                <IconButton className={styles.iconButtonDelete} edge="end" aria-label="comments">
                    <MdDelete className={styles.iconDelete} />
                </IconButton>
              </div>
              }
          >
            <ListItemButton onClick={handleToggle(value)} dense>
              <ListItemIcon>
                <Checkbox
                  className={styles.noteListCheckbox}
                  edge="start"
                  checked={checked.indexOf(value) !== -1}
                  tabIndex={-1}
                  disableRipple
                  inputProps={{ 'aria-labelledby': labelId }}
                />
              </ListItemIcon>
              <ListItemText 
                sx={{textDecoration: checked.indexOf(value) !== -1 ? "line-through" : "none", paddingRight: "3em", lineBreak: "anywhere"}} 
                id={labelId} 
                primary={`Line item ${value + 1}`} 
              />
            </ListItemButton>
          </ListItem>
        )
      })}
    </List>
  )
}