import styles from './styles/home.module.css'
import Link from 'next/link'
import HeroSectionDrawing from '@/SvgDrawings/HeroSectionDrawing'
import { oswald } from '@/fonts/fonts'
import MotionWrap from '../wrappers/MotionWrap'
import { getServerSession } from "next-auth/next"
import { authOptions } from '../app/api/auth/[...nextauth]/route'

export default async function Home() {

  const session = await getServerSession(authOptions)
  
  return (
    <main className={styles.mainPageContainer}>
      <section className={styles.heroTextContainer}>
        <h5 className={`${styles.heroHeader} ${oswald.className}`}>
          Capture,<br/> Organize,<br/> and Remember
        </h5>

        <p className={styles.heroDesc}>
          Effortlessly manage your life with NotesApp, 
          the ultimate notes app designed to streamline your productivity. 
          Whether you&apos;re a student, professional, 
          or simply someone who loves staying organized, 
          NotesApp is here to make your life easier.
        </p>

        <MotionWrap
          style={{width: "10em"}} 
          whileHover={{scale: 1.1}}
          whileTap={{ scale: 0.9 }} 
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <Link 
            href={session ? '/my-notes' : '/login'} 
            className={styles.callToActionBtn}>
            {session ? 'My Notes' : 'Get started'}
          </Link>
        </MotionWrap>
      </section>

      <HeroSectionDrawing />
      
    </main>
  )
}
