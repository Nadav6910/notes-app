'use client'

import styles from "../../app/my-notes/styles/myNotes.module.css"
import { Card, Skeleton, Divider } from '@mui/material'

export default function CardLoadingSkeleton() {
  return (
    <Card 
      className={styles.skeletonCard} 
      sx={{width: "100%", height: "100%"}}
    >
        <Skeleton animation='wave' variant="rectangular" width="100%" height={237} />
        <Divider />
        <div style={{padding: "0.5em", display: "block"}}>
            <Skeleton animation='wave' variant="text" height={25} width={120} />
            <Skeleton sx={{marginBottom: "1.7em"}} animation='wave' variant="text" width={70} height={25} />
            <Skeleton animation='wave' variant="text" width={55} height={25} />
            <Skeleton animation='wave' variant="text" width="100%" height={26} />
        </div>
    </Card>
  )
}
