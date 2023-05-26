import styles from '../../app/styles/mainlayoutstyles.module.css'
import { rockSalt } from '../../fonts/fonts'
import Link from 'next/link'
import { GiNotebook } from 'react-icons/gi'
import ThemeSwitch from "./ThemeSwitch"
import NavbarBtnsSection from './NavbarBtnsSection'

export default function AppNavbar() {

  return (
    <nav className={styles.navbarContainer}>
      
        <Link href={'/'} className={`${rockSalt.className} ${styles.mainLogo}`}>
          Notes App <GiNotebook className={styles.notebookIcon} />
        </Link>

      <div className={styles.linksContainer}>

        <ThemeSwitch />

        <NavbarBtnsSection />
      </div>
    </nav>
  )
}