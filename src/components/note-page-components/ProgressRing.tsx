'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import { Box, Typography } from '@mui/material'
import { BsCheckCircleFill } from 'react-icons/bs'

interface ProgressRingProps {
  progress: number // 0-100
  size?: number
  strokeWidth?: number
  showPercentage?: boolean
  checkedCount?: number
  totalCount?: number
  color?: string
  backgroundColor?: string
}

const ProgressRing = memo(function ProgressRing({
  progress,
  size = 70,
  strokeWidth = 6,
  showPercentage = true,
  checkedCount,
  totalCount,
  color,
  backgroundColor = 'var(--borders-color)'
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference
  const center = size / 2

  // Determine color based on progress
  const getProgressColor = () => {
    if (color) return color
    if (progress === 100) return '#4caf50'
    if (progress >= 75) return '#8bc34a'
    if (progress >= 50) return 'var(--secondary-color)'
    if (progress >= 25) return '#ff9800'
    return '#f44336'
  }

  const progressColor = getProgressColor()
  const isComplete = progress === 100

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size
      }}
    >
      <svg
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          opacity={0.3}
        />
        
        {/* Progress circle */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={progressColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{
            duration: 0.8,
            ease: "easeOut",
            type: "spring",
            stiffness: 100,
            damping: 15
          }}
          style={{
            filter: isComplete ? `drop-shadow(0 0 8px ${progressColor})` : `drop-shadow(0 0 4px ${progressColor}40)`
          }}
        />

        {/* Glow effect for completion */}
        {isComplete && (
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={progressColor}
            strokeWidth={strokeWidth + 4}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{ filter: `blur(6px)` }}
          />
        )}
      </svg>

      {/* Center content */}
      <Box
        sx={{
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          inset: 0
        }}
      >
        {isComplete ? (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            <BsCheckCircleFill style={{ fontSize: size * 0.4, color: progressColor }} />
          </motion.div>
        ) : showPercentage && checkedCount !== undefined && totalCount !== undefined ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <motion.div
              key={checkedCount}
              initial={{ scale: 1.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: size * 0.28,
                  color: progressColor,
                  lineHeight: 1,
                  transition: 'color 0.3s ease',
                  textShadow: `0 0 10px ${progressColor}30`
                }}
              >
                {checkedCount}
              </Typography>
            </motion.div>
            <Box
              sx={{
                width: size * 0.35,
                height: 2,
                bgcolor: progressColor,
                borderRadius: 1,
                my: 0.3,
                opacity: 0.5
              }}
            />
            <Typography
              sx={{
                fontWeight: 600,
                fontSize: size * 0.2,
                color: 'var(--primary-color)',
                lineHeight: 1,
                opacity: 0.7
              }}
            >
              {totalCount}
            </Typography>
          </Box>
        ) : showPercentage ? (
          <motion.div
            key={Math.round(progress)}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: size * 0.22,
                color: progressColor,
                lineHeight: 1,
                transition: 'color 0.3s ease'
              }}
            >
              {Math.round(progress)}%
            </Typography>
          </motion.div>
        ) : null}
      </Box>

      {/* Completion sparkle effect */}
      {isComplete && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ 
            scale: [0, 1.2, 1],
            opacity: [0, 1, 0.8]
          }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{
            position: 'absolute',
            inset: -4,
            borderRadius: '50%',
            border: `2px solid ${progressColor}`,
            opacity: 0.3
          }}
        />
      )}
    </Box>
  )
})

export default ProgressRing
