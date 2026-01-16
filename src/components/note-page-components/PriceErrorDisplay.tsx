'use client'

import { Box, Typography, Button } from '@mui/material'
import { MdError, MdRefresh, MdWifiOff, MdTimer, MdCloudOff } from 'react-icons/md'
import { type PriceError } from '@/lib/error-types'

interface PriceErrorDisplayProps {
  error: PriceError
  onRetry?: () => void
  locale?: 'en' | 'he'
}

const ERROR_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  NETWORK_ERROR: MdWifiOff,
  TIMEOUT: MdTimer,
  SERVICE_UNAVAILABLE: MdCloudOff,
  CIRCUIT_OPEN: MdCloudOff,
  UNKNOWN: MdError
}

export default function PriceErrorDisplay({
  error,
  onRetry,
  locale = 'he'
}: PriceErrorDisplayProps) {
  const Icon = ERROR_ICONS[error.type] || MdError

  const getMessage = () => {
    return locale === 'he' ? error.userMessageHe : error.userMessage
  }

  const retryText = locale === 'he' ? 'נסה שוב' : 'Try again'
  const retryInText = locale === 'he'
    ? `נסו שוב בעוד ${Math.ceil((error.retryAfterMs || 30000) / 1000)} שניות`
    : `Try again in ${Math.ceil((error.retryAfterMs || 30000) / 1000)} seconds`

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1.5,
        p: 2.5,
        bgcolor: 'rgba(211, 47, 47, 0.08)',
        borderRadius: 2,
        border: '1px solid rgba(211, 47, 47, 0.2)'
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          bgcolor: 'rgba(211, 47, 47, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#d32f2f'
        }}
      >
        <Icon size={24} />
      </Box>

      <Typography
        sx={{
          color: 'var(--primary-color)',
          textAlign: 'center',
          fontSize: '0.95rem'
        }}
      >
        {getMessage()}
      </Typography>

      {error.retryAfterMs && error.type === 'CIRCUIT_OPEN' && (
        <Typography
          variant="caption"
          sx={{
            color: 'var(--primary-color)',
            opacity: 0.7,
            textAlign: 'center'
          }}
        >
          {retryInText}
        </Typography>
      )}

      {error.retryable && onRetry && (
        <Button
          variant="outlined"
          size="small"
          startIcon={<MdRefresh />}
          onClick={onRetry}
          sx={{
            mt: 0.5,
            color: 'var(--secondary-color)',
            borderColor: 'var(--secondary-color)',
            textTransform: 'none',
            '&:hover': {
              borderColor: 'var(--secondary-color)',
              bgcolor: 'var(--secondary-color-faded)'
            }
          }}
        >
          {retryText}
        </Button>
      )}
    </Box>
  )
}
