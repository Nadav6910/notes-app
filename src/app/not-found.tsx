'use client'

import styles from "../app/styles/mainlayoutstyles.module.css"
import Lottie from 'lottie-react'
import animationData from '../../public/404.json'

export default function NotFoundPage() {

  return (
    <Lottie className={styles.lottieAnimationNotFound} style={{height: '52em', marginBottom: "-12em"}} animationData={animationData} />
  )
}