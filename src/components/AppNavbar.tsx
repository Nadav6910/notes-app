import styles from '../app/styles/mainlayoutstyles.module.css'
import { rockSalt } from '../fonts/fonts'
import Link from 'next/link'
import { GiNotebook } from 'react-icons/gi'
import MotionWrap from '../wrappers/MotionWrap'
import ThemeSwitch from "../components/ThemeSwitch"

export default function AppNavbar() {

  return (
    <nav className={styles.navbarContainer}>
      
        <Link href={'/'} className={`${rockSalt.className} ${styles.mainLogo}`}>
          Notes App <GiNotebook color='#610c62' />
        </Link>

      <div className={styles.linksContainer}>

        <ThemeSwitch />

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
    </nav>
  )
}