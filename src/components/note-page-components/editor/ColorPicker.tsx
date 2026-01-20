import { memo, useState } from 'react'
import { Tooltip, Popover } from '@mui/material'
import { MdClose } from 'react-icons/md'
import styles from '../../../app/my-notes/note/[noteId]/styles/notePage.module.css'

interface ColorOption {
    name: string
    value: string
}

interface ColorPickerProps {
    colors: ColorOption[]
    onSelect: (color: string) => void
    currentColor?: string
    icon: React.ReactNode
    tooltip: string
}

// Memoized to prevent re-renders when other toolbar buttons are clicked
export const ColorPicker = memo(({
    colors,
    onSelect,
    currentColor,
    icon,
    tooltip
}: ColorPickerProps) => {
    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null)

    return (
        <>
            <Tooltip title={tooltip} arrow placement="top" disableInteractive enterDelay={300} leaveDelay={0}>
                <button
                    type="button"
                    className={`${styles.toolbarButton} ${currentColor ? styles.toolbarButtonActive : ''}`}
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                    onMouseDown={(e) => e.preventDefault()}
                >
                    {icon}
                </button>
            </Tooltip>
            <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                slotProps={{
                    paper: {
                        className: styles.colorPickerPopover
                    }
                }}
            >
                <div className={styles.colorPickerGrid}>
                    {colors.map((color) => (
                        <button
                            key={color.name}
                            className={`${styles.colorPickerItem} ${currentColor === color.value ? styles.colorPickerItemActive : ''}`}
                            style={{ backgroundColor: color.value || 'var(--note-card-background-card-item)' }}
                            onClick={() => {
                                onSelect(color.value)
                                setAnchorEl(null)
                            }}
                            title={color.name}
                        >
                            {!color.value && <MdClose size={12} />}
                        </button>
                    ))}
                </div>
            </Popover>
        </>
    )
})

ColorPicker.displayName = 'ColorPicker'
