'use client'

import styles from "../../app/my-notes/note/[noteId]/styles/notePage.module.css"
import { Box, Skeleton, Divider } from '@mui/material'

export default function CardLoadingSkeleton() {

  return (
    <>
      {/* Stats Dashboard Skeleton - matches the new dashboard design */}
      <Box 
        sx={{ 
          width: '100%', 
          mb: 2,
          p: 1.5,
          borderRadius: 2,
          bgcolor: 'var(--note-card-background-card-item)',
          border: '1px solid var(--borders-color)',
        }}
      >
        {/* Items count row */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Skeleton 
              animation="wave" 
              variant="rounded" 
              width={90} 
              height={26} 
              sx={{ borderRadius: '16px' }}
            />
            <Skeleton 
              animation="wave" 
              variant="rounded" 
              width={50} 
              height={26} 
              sx={{ borderRadius: '16px' }}
            />
            <Skeleton 
              animation="wave" 
              variant="rounded" 
              width={50} 
              height={26} 
              sx={{ borderRadius: '16px' }}
            />
          </Box>
          
          {/* Progress indicator skeleton */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Skeleton animation="wave" variant="text" width={50} height={18} />
            <Skeleton animation="wave" variant="rounded" width={70} height={6} sx={{ borderRadius: 3 }} />
          </Box>
        </Box>
        
        {/* Occupancy indicator skeleton */}
        <Box 
          sx={{ 
            mt: 1.5, 
            pt: 1.5, 
            borderTop: '1px solid var(--borders-color)',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <Skeleton 
            animation="wave" 
            variant="rounded" 
            width={130} 
            height={26} 
            sx={{ borderRadius: '16px' }}
          />
        </Box>
      </Box>

      {/* Toolbar skeleton - Add button + view/sort buttons */}
      <Box 
        sx={{
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          width: "100%",
          mb: 1
        }}
      >
        <Skeleton 
          sx={{ borderRadius: "12px" }}
          animation="wave" 
          variant="rounded" 
          width={110} 
          height={50} 
        />
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Skeleton 
            sx={{ borderRadius: "12px" }}
            animation="wave" 
            variant="rounded" 
            width={55} 
            height={45} 
          />
          <Skeleton 
            sx={{ borderRadius: "12px" }}
            animation="wave" 
            variant="rounded" 
            width={55} 
            height={45} 
          />
        </Box>
      </Box>

      {/* Search input skeleton */}
      <Skeleton 
        sx={{ mb: 1.5, width: "100%", borderRadius: "12px" }}
        animation="wave" 
        variant="rounded" 
        height={48} 
      />

      {/* Filter selector skeleton */}
      <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5, width: '100%' }}>
        <Skeleton 
          animation="wave" 
          variant="rounded" 
          width={50} 
          height={38} 
          sx={{ borderRadius: '10px' }}
        />
        <Skeleton 
          animation="wave" 
          variant="rounded" 
          width={90} 
          height={38} 
          sx={{ borderRadius: '10px' }}
        />
      </Box>

      {/* List items skeleton */}
      <Box 
        className={styles.noteItemsListSkeleton}
        sx={{
          width: "100%", 
          borderRadius: "12px",
          overflow: 'hidden',
          bgcolor: 'var(--note-card-background-card-item)',
          border: '1px solid var(--borders-color)',
          boxShadow: '0px 2px 18px 3px rgba(0, 0, 0, 0.08)'
        }}
      >
        {[...Array(6)].map((_, index) => (
          <Box key={index}>
            <Box sx={{ display: 'flex', alignItems: 'center', p: 1.5, gap: 1.5 }}>
              {/* Checkbox skeleton */}
              <Skeleton 
                animation="wave" 
                variant="circular" 
                width={26} 
                height={26} 
              />
              
              {/* Content skeleton */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Skeleton 
                  animation="wave" 
                  variant="text" 
                  width={`${55 + (index % 3) * 15}%`} 
                  height={24} 
                />
                <Skeleton 
                  animation="wave" 
                  variant="text" 
                  width={70} 
                  height={16} 
                />
              </Box>
              
              {/* Action buttons skeleton */}
              <Box sx={{ display: 'flex', gap: 0.8, flexShrink: 0 }}>
                <Skeleton 
                  animation="wave" 
                  variant="circular" 
                  width={30} 
                  height={30} 
                />
                <Skeleton 
                  animation="wave" 
                  variant="circular" 
                  width={30} 
                  height={30} 
                />
              </Box>
            </Box>
            {index < 5 && <Divider sx={{ borderColor: 'var(--borders-color)' }} />}
          </Box>
        ))}
      </Box>
    </>
  )
}
