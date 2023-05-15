'use client'

import { motion } from "framer-motion"
import { MotionProps } from "framer-motion"


export default function MotionWrap({children, style, animate, whileHover, whileTap, transition}: MotionProps) {
  return (
    <motion.div
      style={style} 
      animate={animate} 
      whileHover={whileHover} 
      whileTap={whileTap} 
      transition={transition}
    >
        {children}
    </motion.div>
  )
}
