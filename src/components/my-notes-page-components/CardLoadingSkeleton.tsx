'use client'

import { Card, Skeleton, Divider } from '@mui/material'

export default function CardLoadingSkeleton() {
  return (
    <Card sx={{ backgroundColor: '#eeeeee', opacity: 0.7, maxWidth: "22em"}}>
        <Skeleton animation='wave' variant="rectangular" width="100%" height={180} />
        <Divider />
        <div style={{padding: "0.5em", display: "block"}}>
            <Skeleton animation='wave' variant="text" width="100%" height={40} />
            <Skeleton sx={{marginBottom: "2em"}} animation='wave' variant="text" width="100%" height={30} />
            <Skeleton sx={{marginBottom: "0.5em"}} animation='wave' variant="rectangular" width="100%" height={20} />
        </div>
    </Card>
  )
}
