import styles from '../../app/styles/mainlayoutstyles.module.css'
import NavbarAuthBtnsSection from './NavbarAuthBtnsSection'
import { getServerSession } from "next-auth/next"
import MotionWrap from '@/wrappers/MotionWrap'
import { rockSalt } from '../../fonts/fonts'
import Link from 'next/link'
import { GiNotebook } from 'react-icons/gi'
import ThemeSwitch from "./ThemeSwitch"
import { authOptions } from '../../app/api/auth/[...nextauth]/options'
import MenuDrawer from './MenuDrawer'

export default async function AppNavbar() {

  const session = await getServerSession(authOptions)
  
  return (
    <nav className={styles.navbarContainer}>
      
        <Link href={'/'} className={`${rockSalt.className} ${styles.mainLogo}`}>
          Notes App <GiNotebook className={styles.notebookIcon} />
        </Link>

      <div className={styles.linksContainer}>

        <div className={styles.mobileNavContainer}>
          <MenuDrawer 
            isSession={session ? true : false} 
            userName={session?.user?.name} 
            userImage={session?.user?.image} 
          />
        </div>

        <div className={styles.desktopNavContainer}>
          
          <ThemeSwitch />

          {session ? 
          
            <NavbarAuthBtnsSection userName={session?.user?.name} userImage={session?.user?.image} /> :

            <div style={{display: "flex", alignItems: "center", gap: "1em"}}>
              <MotionWrap 
                whileHover={{scale: 1.1}}
                whileTap={{ scale: 0.9 }} 
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                  <Link href={'/login'} className={styles.loginLink}>Log In</Link>
              </MotionWrap>
              
              <MotionWrap 
                whileHover={{scale: 1.1}}
                whileTap={{ scale: 0.9 }} 
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                  <Link href={'/register'} className={styles.registerLink}>Register</Link>
              </MotionWrap>
            </div>
          }
        </div>

      </div>
    </nav>
  )
}