import styles from './styles/home.module.css'
import HeroSectionDrawing from '@/SvgDrawings/HeroSectionDrawing'
import { oswald } from '@/fonts/fonts'
import Link from 'next/link'
import MotionWrap from '../wrappers/MotionWrap'

export default function Home() {

  return (
    <main className={styles.mainPageContainer}>
      <section className={styles.heroTextContainer}>
        <h5 className={`${styles.heroHeader} ${oswald.className}`}>
          Capture,<br/> Organize,<br/> and Remember
        </h5>

        <p className={styles.heroDesc}>
          Effortlessly manage your life with NoteMaster, 
          the ultimate notes app designed to streamline your productivity. 
          Whether you&apos;re a student, professional, 
          or simply someone who loves staying organized, 
          NoteMaster is here to make your life easier.
        </p>

        <MotionWrap
          style={{width: "10em"}} 
          whileHover={{scale: 1.1}}
          whileTap={{ scale: 0.9 }} 
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <Link href={'/login'} className={styles.callToActionBtn}>Get started</Link>
        </MotionWrap>
      </section>

      <HeroSectionDrawing />
    </main>
  )
}
