'use client'

import styles from "../../app/styles/mainlayoutstyles.module.css"
import dynamic from 'next/dynamic'
import animationData from '../../../public/404.json'

// Dynamically import Lottie with SSR disabled to prevent "document is not defined" error
const Lottie = dynamic(() => import('lottie-react'), { ssr: false })

export default function NotFoundCatchAll() {
  return (
    <>
      <h3 className={styles.notFoundTitle}>Page Not Found</h3>

      <Lottie
        className={styles.lottieAnimationNotFound}
        style={{height: '45em', marginBottom: "-12em"}}
        animationData={animationData}
      />
    </>
  )
}