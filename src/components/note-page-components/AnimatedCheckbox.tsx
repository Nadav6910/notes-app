import Checkbox, { CheckboxProps } from '@mui/material/Checkbox'
import Box from '@mui/material/Box'

interface AnimatedCheckboxProps extends CheckboxProps {
  className?: string,
  theme?: string | undefined,
}

const CustomIcon: React.FC<{ checked: boolean, theme?: string | undefined }> = ({ checked, theme }) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24">
      {/* Background box with rounded corners */}
      <rect
        x="1"
        y="1"
        width="22"
        height="22"
        rx="4"
        ry="4"
        fill={checked ? (theme === "dark" ? '#19a29b' : '#610c62') : 'transparent'}
        stroke="currentColor"
        strokeWidth="2"
        style={{
          transition: 'fill 0.5s ease-in-out'
        }}
      />
      {/* Check mark that animates in and out using a stroke-dash technique */}
      <polyline
        points="20 6 9 17 4 12"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 30,
          strokeDashoffset: checked ? 0 : 30,
          transition: 'stroke-dashoffset 0.5s ease-in-out'
        }}
      />
    </svg>
  )
}

const AnimatedCheckbox: React.FC<AnimatedCheckboxProps> = (props) => {
  const { checked, onChange, sx, className, theme, ...other } = props
  return (
    <Box
      className={className}
      sx={{
        position: 'relative',
        display: 'inline-flex',
        width: 24,
        height: 24,
        ...sx
      }}
    >
      {/* The underlying MUI Checkbox for form integration */}
      <Checkbox
        checked={checked}
        onChange={onChange}
        disableRipple
        icon={<Box sx={{ width: 24, height: 24 }} />}
        checkedIcon={<Box sx={{ width: 24, height: 24 }} />}
        {...other}
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 24,
          height: 24,
          opacity: 0,
          zIndex: 1,
          '&:hover': {
            backgroundColor: 'transparent'
          }
        }}
      />
      {/* The overlay with our animated SVG */}
      <Box sx={{ pointerEvents: 'none' }}>
        <CustomIcon checked={!!checked} theme={theme} />
      </Box>
    </Box>
  )
}

export default AnimatedCheckbox