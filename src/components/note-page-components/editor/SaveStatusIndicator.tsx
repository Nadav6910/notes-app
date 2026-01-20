import { memo } from 'react'
import { CircularProgress } from '@mui/material'
import { MdCloudDone, MdEdit, MdError } from 'react-icons/md'
import MotionWrap from '@/wrappers/MotionWrap'
import { SaveStatus } from '@/app/hooks/useAutoSave'
import styles from '../../../app/my-notes/note/[noteId]/styles/notePage.module.css'

interface SaveStatusIndicatorProps {
    status: SaveStatus
    lastSaved: Date | null
}

// Memoized to prevent re-renders when parent component updates
export const SaveStatusIndicator = memo(({ status, lastSaved }: SaveStatusIndicatorProps) => {
    const getConfig = () => {
        switch (status) {
            case 'saved':
                return { icon: <MdCloudDone />, text: 'Saved', color: 'var(--secondary-color)' }
            case 'saving':
                return { icon: <CircularProgress size={14} sx={{ color: 'var(--primary-color)' }} />, text: 'Saving...', color: 'var(--primary-color)' }
            case 'unsaved':
                return { icon: <MdEdit />, text: 'Unsaved', color: '#f59e0b' }
            case 'error':
                return { icon: <MdError />, text: 'Error', color: '#ef4444' }
        }
    }

    const config = getConfig()

    return (
        <MotionWrap
            className={styles.saveStatus}
            style={{ color: config.color }}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
        >
            {config.icon}
            <span>{config.text}</span>
            {status === 'saved' && lastSaved && (
                <span className={styles.lastSavedTime}>
                    at {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            )}
        </MotionWrap>
    )
})

SaveStatusIndicator.displayName = 'SaveStatusIndicator'
