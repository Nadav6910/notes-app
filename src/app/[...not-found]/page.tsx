'use client'

import styles from "../../app/styles/mainlayoutstyles.module.css"
import Lottie from 'lottie-react'
import animationData from '../../../public/404.json'


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