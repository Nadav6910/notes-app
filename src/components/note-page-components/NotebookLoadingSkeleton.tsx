'use client'

import { Card, Skeleton } from '@mui/material'

export default function NotebookLoadingSkeleton() {

  return (
    <>
        <Skeleton 
            sx={{marginBottom: "1.5em", width: "11em", backgroundColor: "silver", alignSelf: "flex-start"}} 
            animation='wave' 
            variant="text" 
            height={25} 
        />

        <Skeleton 
            sx={{marginBottom: "1em", width: "10em", backgroundColor: "silver", borderRadius: "12px", alignSelf: "flex-start"}} 
            animation='wave' 
            variant="rounded" 
            height={55} 
        />
        <Card sx={{ backgroundColor: 'silver', width: "100%", height: "100%"}}>
            <Skeleton animation='wave' variant="text" width="100%" height={80} />
            <Skeleton animation='wave' variant="text" width="100%" height={80} />
            <Skeleton animation='wave' variant="text" width="100%" height={80} />
            <Skeleton animation='wave' variant="text" width="100%" height={80} />
            <Skeleton animation='wave' variant="text" width="100%" height={80} />
            <Skeleton animation='wave' variant="text" width="100%" height={80} />
        </Card>
    </>
  )
}