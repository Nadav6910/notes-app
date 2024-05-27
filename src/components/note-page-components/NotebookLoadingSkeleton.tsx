'use client'

import styles from "../../app/my-notes/note/[noteId]/styles/notePage.module.css"
import { Card, Skeleton } from '@mui/material'

export default function NotebookLoadingSkeleton() {

  return (
    <>
      <Skeleton 
        sx={{marginBottom: "1em", width: "10.5em", borderRadius: "12px", alignSelf: "flex-start"}} 
        animation='wave' 
        variant="rounded" 
        height={47} 
      />
      
      <Card 
        className={styles.noteItemsListSkeleton} 
        sx={{width: "100%", height: "100%", border: "GrayText 1px solid", borderRadius: "15px"}}
      >
        <Skeleton animation='wave' variant="rounded" width="100%" height={750} />
      </Card>
    </>
  )
}