import styles from './styles/home.module.css'
import { getServerSession } from "next-auth/next"
import { authOptions } from './api/auth/[...nextauth]/options'
import HeroSectionDrawing from '@/SvgDrawings/HeroSectionDrawing'
import { oswald } from '@/fonts/fonts'
import MainPageButton from '@/components/main_components/MainPageButton'

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

        <MainPageButton session={session} />
      </section>

      <HeroSectionDrawing />
      
    </main>
  )
}
