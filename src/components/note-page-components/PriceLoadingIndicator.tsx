'use client'

import { useState, useEffect } from 'react'
import { Box, CircularProgress, Typography, LinearProgress, Button } from '@mui/material'

export type LoadingStage = 'connecting' | 'searching' | 'fetching' | 'processing'

const STAGE_MESSAGES: Record<LoadingStage, { en: string; he: string }> = {
  connecting: { en: 'Connecting to service...', he: 'מתחבר לשירות...' },
  searching: { en: 'Searching for products...', he: 'מחפש מוצרים...' },
  fetching: { en: 'Loading prices...', he: 'טוען מחירים...' },
  processing: { en: 'Processing results...', he: 'מעבד תוצאות...' }
}

const STAGE_PROGRESS: Record<LoadingStage, number> = {
  connecting: 15,
  searching: 40,
  fetching: 70,
  processing: 90
}

interface PriceLoadingIndicatorProps {
  stage?: LoadingStage
  estimatedTimeMs?: number
  onCancel?: () => void
  locale?: 'en' | 'he'
}

export default function PriceLoadingIndicator({
  stage = 'connecting',
  estimatedTimeMs = 15000,
  onCancel,
  locale = 'he'
}: PriceLoadingIndicatorProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(prev => prev + 100)
    }, 100)
    return () => clearInterval(interval)
  }, [])

  // Reset elapsed when stage changes
  useEffect(() => {
    setElapsed(0)
  }, [stage])

  const baseProgress = STAGE_PROGRESS[stage]
  const stageWeight = 25 // Each stage contributes up to 25% progress
  const elapsedProgress = Math.min((elapsed / (estimatedTimeMs / 4)) * stageWeight, stageWeight - 5)
  const progress = Math.min(baseProgress + elapsedProgress, 95)

  const showLongWaitMessage = elapsed > 8000
  const showVeryLongWaitMessage = elapsed > 15000

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1.5,
        p: 2,
        width: '100%'
      }}
    >
      <CircularProgress
        size={36}
        thickness={4}
        sx={{ color: 'var(--secondary-color)' }}
      />

      <Typography
        sx={{
          color: 'var(--primary-color)',
          fontSize: '0.95rem',
          textAlign: 'center',
          fontWeight: 500
        }}
      >
        {STAGE_MESSAGES[stage][locale]}
      </Typography>

      <Box sx={{ width: '100%', maxWidth: 220 }}>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 6,
            borderRadius: 3,
            bgcolor: 'var(--borders-color)',
            '& .MuiLinearProgress-bar': {
              bgcolor: 'var(--secondary-color)',
              borderRadius: 3,
              transition: 'transform 0.3s ease'
            }
          }}
        />
      </Box>

      {showLongWaitMessage && !showVeryLongWaitMessage && (
        <Typography
          sx={{
            color: 'var(--primary-color)',
            fontSize: '0.8rem',
            opacity: 0.7,
            textAlign: 'center'
          }}
        >
          {locale === 'he'
            ? 'זה עשוי לקחת עוד כמה שניות...'
            : 'This may take a few more seconds...'}
        </Typography>
      )}

      {showVeryLongWaitMessage && (
        <Typography
          sx={{
            color: 'var(--primary-color)',
            fontSize: '0.8rem',
            opacity: 0.7,
            textAlign: 'center'
          }}
        >
          {locale === 'he'
            ? 'השירות עמוס כרגע. ממשיכים לנסות...'
            : 'Service is busy. Still trying...'}
        </Typography>
      )}

      {onCancel && (
        <Button
          variant="text"
          size="small"
          onClick={onCancel}
          sx={{
            color: 'var(--primary-color)',
            opacity: 0.7,
            fontSize: '0.85rem',
            textTransform: 'none',
            '&:hover': {
              opacity: 1,
              bgcolor: 'var(--secondary-color-faded)'
            }
          }}
        >
          {locale === 'he' ? 'בטל' : 'Cancel'}
        </Button>
      )}
    </Box>
  )
}
