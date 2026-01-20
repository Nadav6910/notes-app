'use client'

import styles from "../../app/my-notes/styles/myNotes.module.css"
import { Card, Skeleton } from '@mui/material'

export default function CardLoadingSkeletonListView() {
  return (
    <Card
      className={styles.skeletonCardListView}
      sx={{
        borderLeft: "4px solid var(--secondary-color-faded)",
        borderRadius: "10px"
      }}
    >
        <div style={{
            display: "flex",
            alignItems: "center",
            gap: "1em",
            padding: "1em 1.2em"
        }}>
            {/* Note type icon skeleton */}
            <Skeleton
                animation='wave'
                variant="rounded"
                width={45}
                height={45}
                sx={{ borderRadius: "10px", flexShrink: 0 }}
            />

            {/* Info section */}
            <div style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: "0.3em",
                minWidth: 0
            }}>
                {/* Main row - name and type */}
                <div style={{display: "flex", alignItems: "center", gap: "0.75em"}}>
                    <Skeleton
                        animation='wave'
                        variant="text"
                        width="40%"
                        height={24}
                    />
                    <Skeleton
                        animation='wave'
                        variant="text"
                        width={70}
                        height={16}
                    />
                </div>

                {/* Metadata row */}
                <div style={{display: "flex", alignItems: "center", gap: "1em"}}>
                    <Skeleton animation='wave' variant="text" width={50} height={16} />
                    <Skeleton animation='wave' variant="text" width={80} height={16} />
                </div>
            </div>

            {/* Action buttons */}
            <div style={{display: "flex", gap: "0.3em", marginLeft: "auto"}}>
                <Skeleton animation='wave' variant="circular" width={32} height={32} />
                <Skeleton animation='wave' variant="circular" width={32} height={32} />
                <Skeleton animation='wave' variant="circular" width={32} height={32} />
            </div>
        </div>
    </Card>
  )
}
