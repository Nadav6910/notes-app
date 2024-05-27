'use client'

import styles from "../../app/my-notes/note/[noteId]/styles/notePage.module.css"
import { Card, Skeleton, Divider } from '@mui/material'

export default function CardLoadingSkeleton() {

  return (
    <>

      <Skeleton 
        sx={{marginBottom: "1.2em", marginTop: "-0.5em", width: "13em", alignSelf: "flex-start"}} 
        animation='wave' 
        variant="text" 
        height={28} 
      />

      <div 
        style={{
          marginBottom: "0.65em", 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          width: "100%"
        }}
      >
        <Skeleton 
          sx={{width: "10em", borderRadius: "12px"} }
          animation='wave' 
          variant="rounded" 
          height={55} 
        />
        <div style={{display: "flex", gap: "0.5em"}}>
          <Skeleton 
            sx={{width: "5em", borderRadius: "12px"}} 
            animation='wave' 
            variant="rounded" 
            height={50} 
          />
          <Skeleton 
            sx={{width: "5em", borderRadius: "12px"}} 
            animation='wave' 
            variant="rounded" 
            height={50} 
          />
        </div>
      </div>

      <Skeleton 
        sx={{marginBottom: "0.65em", width: "100%", borderRadius: "12px"}} 
        animation='wave' 
        variant="rounded" 
        height={50} 
      />

      <Card className={styles.noteItemsListSkeleton} sx={{width: "100%", height: "100%"}}>
          <Skeleton animation='wave' variant="text" width="100%" height={80} />
          <Divider />
          <Skeleton animation='wave' variant="text" width="100%" height={80} />
          <Divider />
          <Skeleton animation='wave' variant="text" width="100%" height={80} />
          <Divider />
          <Skeleton animation='wave' variant="text" width="100%" height={80} />
          <Divider />
          <Skeleton animation='wave' variant="text" width="100%" height={80} />
          <Divider />
          <Skeleton animation='wave' variant="text" width="100%" height={80} />
      </Card>
    </>
  )
}
