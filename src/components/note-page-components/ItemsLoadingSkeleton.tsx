'use client'

import { Card, Skeleton, Divider } from '@mui/material'

export default function CardLoadingSkeleton() {

  return (
    <>

      <Skeleton 
        sx={{marginBottom: "1.5em", width: "4em", backgroundColor: "silver", alignSelf: "flex-start"}} 
        animation='wave' 
        variant="text" 
        height={25} 
      />

      <Skeleton 
        sx={{marginBottom: "1em", width: "8em", backgroundColor: "silver", alignSelf: "flex-start", borderRadius: "12px"}} 
        animation='wave' 
        variant="rounded" 
        height={50} 
      />

      <Skeleton 
        sx={{marginBottom: "1em", width: "100%", backgroundColor: "silver", borderRadius: "12px"}} 
        animation='wave' 
        variant="rounded" 
        height={50} 
      />

      <Card sx={{ backgroundColor: '#eeeeee', width: "100%", height: "100%"}}>
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
