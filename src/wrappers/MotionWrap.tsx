'use client'

import { motion } from "framer-motion"
import { MotionProps } from "framer-motion"

interface MotionWrapperProps extends MotionProps {
  className?: string;
  onClick?: () => void;
}

export default function MotionWrap(
  {
    children, 
    className, 
    style, 
    animate, 
    whileHover, 
    whileTap, 
    transition,
    initial,
    exit,
    onClick
  }: MotionWrapperProps) {
  
  return (
    <motion.div
      className={className}
      style={style} 
      animate={animate} 
      whileHover={whileHover} 
      whileTap={whileTap} 
      transition={transition}
      initial={initial}
      exit={exit}
      onClick={onClick}
    >
        {children}
    </motion.div>
  )
}
