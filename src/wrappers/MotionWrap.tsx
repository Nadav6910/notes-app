'use client'

import { motion } from "framer-motion"
import { MotionProps } from "framer-motion"

interface MotionWrapperProps extends MotionProps {
  className?: string;
}

export default function MotionWrap({children, className, style, animate, whileHover, whileTap, transition}: MotionWrapperProps) {
  
  return (
    <motion.div
      className={className}
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
