'use client'

import Lottie from 'lottie-react'
import animationData from '../../public/404.json'

export default function NotFoundPage() {

  return (
    <Lottie style={{height: '52em', marginBottom: "-12em"}} animationData={animationData} />
  )
}