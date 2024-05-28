'use client'

import { m, domAnimation, LazyMotion } from "framer-motion"
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
    <LazyMotion features={domAnimation}>
      <m.div
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
      </m.div>
    </LazyMotion>
  )
}
