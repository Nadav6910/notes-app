'use client'

import styles from "../../app/my-notes/styles/myNotes.module.css"
import { Card, Skeleton } from '@mui/material'

export default function CardLoadingSkeletonListView() {
  return (
    <Card
      className={styles.skeletonCardListView}
    >
        <div style={{padding: "0.5em", display: "block"}}>
            <Skeleton animation='wave' variant="text" width="100%" height={40} />
            <Skeleton sx={{marginBottom: "2em"}} animation='wave' variant="text" width="100%" height={30} />
            <Skeleton sx={{marginBottom: "0.15em"}} animation='wave' variant="rectangular" width="100%" height={20} />
        </div>
    </Card>
  )
}