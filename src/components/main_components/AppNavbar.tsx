'use client'

import styles from '../../app/styles/mainlayoutstyles.module.css'
import NavbarAuthBtnsSection from './NavbarAuthBtnsSection'
import MotionWrap from '@/wrappers/MotionWrap'
import { rockSalt } from '../../fonts/fonts'
import Link from 'next/link'
import { GiNotebook } from 'react-icons/gi'
import ThemeSwitch from './ThemeSwitch'
import MenuDrawer from './MenuDrawer'
import { useSession } from 'next-auth/react'
import { Box } from '@mui/material'
import { LinearProgress } from '@mui/material'

export default function AppNavbar () {
  const { data: session, status } = useSession()
  const isLoading = status === 'loading'
  const isSession = !!session
  const userName = session?.user?.name
  const userImage = session?.user?.image

  return (
    <nav className={styles.navbarContainer}>
      <Link href='/' className={`${rockSalt.className} ${styles.mainLogo}`}>
        Notes App <GiNotebook className={styles.notebookIcon} />
      </Link>

      <div className={styles.linksContainer}>
        {/* Mobile */}
        <div className={styles.mobileNavContainer}>
          {isLoading ? (
            <LinearProgress sx={{ width: 100, color: 'var(--secondary-color)' }} />
          ) : (
            <MenuDrawer
              isSession={isSession}
              userName={userName}
              userImage={userImage}
            />
          )}
        </div>

        {/* Desktop */}
        <div className={styles.desktopNavContainer}>
          <ThemeSwitch />
          {isLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <LinearProgress 
                sx={{
                  width: 100,
                  backgroundColor: 'color-mix(in srgb, var(--secondary-color) 20%, transparent)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: 'var(--secondary-color)'
                  }
                }} 
              />
            </Box>
          ) : isSession ? (
            <NavbarAuthBtnsSection userName={userName} userImage={userImage} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1em' }}>
              <MotionWrap whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.96 }} transition={{ type: 'spring', stiffness: 400, damping: 12 }}>
                <Link href='/login' className={styles.loginLink}>Log In</Link>
              </MotionWrap>
              <MotionWrap whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.96 }} transition={{ type: 'spring', stiffness: 400, damping: 12 }}>
                <Link href='/register' className={styles.registerLink}>Register</Link>
              </MotionWrap>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
