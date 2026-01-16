'use client'

import { Box, Typography, Button } from '@mui/material'
import { MdSearchOff, MdRefresh, MdLocationOn } from 'react-icons/md'

interface PriceEmptyStateProps {
  productName?: string
  location?: string
  onRetry?: () => void
  locale?: 'en' | 'he'
}

export default function PriceEmptyState({
  productName,
  location,
  onRetry,
  locale = 'he'
}: PriceEmptyStateProps) {
  const texts = {
    he: {
      title: 'לא נמצאו מחירים',
      description: productName && location
        ? `לא מצאנו מחירים עבור "${productName}" באזור ${location}.`
        : 'לא נמצאו מחירים למוצר זה באזור שנבחר.',
      retry: 'נסה שוב',
      tips: [
        'נסו לחפש שם מוצר מדויק יותר',
        'בדקו את האיות של שם המוצר',
        'נסו מוצר דומה עם שם אחר'
      ],
      tipsTitle: 'טיפים:'
    },
    en: {
      title: 'No prices found',
      description: productName && location
        ? `We couldn't find prices for "${productName}" in ${location}.`
        : 'No prices found for this product in the selected area.',
      retry: 'Try again',
      tips: [
        'Try a more specific product name',
        'Check the spelling of the product name',
        'Try a similar product with a different name'
      ],
      tipsTitle: 'Tips:'
    }
  }

  const t = texts[locale]

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        p: 3,
        textAlign: 'center'
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          bgcolor: 'var(--secondary-color-faded)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <MdSearchOff
          size={32}
          style={{ color: 'var(--primary-color)', opacity: 0.6 }}
        />
      </Box>

      <Typography
        variant="h6"
        sx={{
          color: 'var(--primary-color)',
          fontWeight: 600
        }}
      >
        {t.title}
      </Typography>

      <Typography
        variant="body2"
        sx={{
          color: 'var(--primary-color)',
          opacity: 0.7,
          maxWidth: 300
        }}
      >
        {t.description}
      </Typography>

      {location && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            color: 'var(--primary-color)',
            opacity: 0.6,
            fontSize: '0.85rem'
          }}
        >
          <MdLocationOn size={16} />
          <span>{location}</span>
        </Box>
      )}

      <Box
        sx={{
          display: 'flex',
          gap: 1,
          flexWrap: 'wrap',
          justifyContent: 'center',
          mt: 1
        }}
      >
        {onRetry && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<MdRefresh />}
            onClick={onRetry}
            sx={{
              color: 'var(--secondary-color)',
              borderColor: 'var(--secondary-color)',
              textTransform: 'none',
              '&:hover': {
                borderColor: 'var(--secondary-color)',
                bgcolor: 'var(--secondary-color-faded)'
              }
            }}
          >
            {t.retry}
          </Button>
        )}
      </Box>

      <Box
        sx={{
          mt: 2,
          p: 2,
          bgcolor: 'var(--secondary-color-faded)',
          borderRadius: 2,
          maxWidth: 280
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: 'var(--primary-color)',
            fontWeight: 600,
            display: 'block',
            mb: 1
          }}
        >
          {t.tipsTitle}
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 2 }}>
          {t.tips.map((tip, idx) => (
            <Typography
              key={idx}
              component="li"
              variant="caption"
              sx={{
                color: 'var(--primary-color)',
                opacity: 0.7,
                mb: 0.5,
                textAlign: locale === 'he' ? 'right' : 'left'
              }}
            >
              {tip}
            </Typography>
          ))}
        </Box>
      </Box>
    </Box>
  )
}
