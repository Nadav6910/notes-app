import styles from '../../app/styles/mainlayoutstyles.module.css'
import MotionWrap from '@/wrappers/MotionWrap'
import { rockSalt } from '../../fonts/fonts'
import Link from 'next/link'
import { GiNotebook } from 'react-icons/gi'
import ThemeSwitch from "./ThemeSwitch"
import NavbarAuthBtnsSection from './NavbarAuthBtnsSection'
import { getServerSession } from "next-auth/next"
import { authOptions } from '../../app/api/auth/[...nextauth]/route'

export default async function AppNavbar() {

  const session = await getServerSession(authOptions)

  return (
    <nav className={styles.navbarContainer}>
      
        <Link href={'/'} className={`${rockSalt.className} ${styles.mainLogo}`}>
          Notes App <GiNotebook className={styles.notebookIcon} />
        </Link>

      <div className={styles.linksContainer}>

        <ThemeSwitch />

        {session ? 
        
        <NavbarAuthBtnsSection userName={session?.user?.name} /> :

          <>
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
          </>
        }
      </div>
    </nav>
  )
}