'use client'

import styles from "../../app/my-notes/styles/myNotes.module.css"
import { Card, Skeleton } from '@mui/material'

export default function CardLoadingSkeleton() {
  return (
    <Card
      className={styles.skeletonCard}
      sx={{width: "100%", height: "100%", position: "relative", overflow: "hidden"}}
    >
        {/* Accent bar skeleton */}
        <Skeleton
            animation='wave'
            variant="rectangular"
            width="100%"
            height={4}
            sx={{ position: "absolute", top: 0, left: 0, right: 0 }}
        />

        {/* SVG container skeleton with gradient effect */}
        <Skeleton
            animation='wave'
            variant="rectangular"
            width="100%"
            height={208}
            sx={{
                background: 'linear-gradient(180deg, transparent 0%, var(--secondary-color-faded) 100%)'
            }}
        />

        {/* Content section */}
        <div style={{padding: "1em 1em 0.5em 1em"}}>
            {/* Note name */}
            <Skeleton
                animation='wave'
                variant="text"
                height={28}
                width="70%"
                sx={{ marginBottom: "0.3em" }}
            />
            {/* Note type */}
            <Skeleton
                animation='wave'
                variant="text"
                width={80}
                height={20}
                sx={{ marginBottom: "0.5em" }}
            />
        </div>

        {/* Footer section */}
        <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 1em 1em 1em"
        }}>
            {/* Metadata */}
            <div style={{display: "flex", flexDirection: "column", gap: "0.2em"}}>
                <Skeleton animation='wave' variant="text" width={60} height={18} />
                <Skeleton animation='wave' variant="text" width={90} height={18} />
            </div>

            {/* Action buttons */}
            <div style={{display: "flex", gap: "0.3em"}}>
                <Skeleton animation='wave' variant="circular" width={32} height={32} />
                <Skeleton animation='wave' variant="circular" width={32} height={32} />
                <Skeleton animation='wave' variant="circular" width={32} height={32} />
            </div>
        </div>
    </Card>
  )
}
