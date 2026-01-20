import { memo, useState } from 'react'
import { Tooltip } from '@mui/material'
import styles from '../../../app/my-notes/note/[noteId]/styles/notePage.module.css'

interface ToolbarButtonProps {
    icon: React.ReactNode
    tooltip: string
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
    shortcut?: string
    isActive?: boolean
    disabled?: boolean
}

// Memoized to prevent re-renders of all toolbar buttons when one is clicked
export const ToolbarButton = memo(({
    icon,
    tooltip,
    onClick,
    shortcut,
    isActive = false,
    disabled = false
}: ToolbarButtonProps) => {
    const [showTooltip, setShowTooltip] = useState(false)

    return (
        <Tooltip
            title={shortcut ? `${tooltip} (${shortcut})` : tooltip}
            arrow
            placement="top"
            open={showTooltip && !disabled}
            onOpen={() => setShowTooltip(true)}
            onClose={() => setShowTooltip(false)}
            disableInteractive
            enterDelay={300}
            leaveDelay={0}
        >
            <span>
                <button
                    type="button"
                    className={`${styles.toolbarButton} ${isActive ? styles.toolbarButtonActive : ''}`}
                    onClick={(e) => {
                        setShowTooltip(false)
                        onClick(e)
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseLeave={() => setShowTooltip(false)}
                    disabled={disabled}
                >
                    {icon}
                </button>
            </span>
        </Tooltip>
    )
})

ToolbarButton.displayName = 'ToolbarButton'
