'use client'

import { m, domAnimation, LazyMotion } from "framer-motion"
import { MotionProps } from "framer-motion"
import { forwardRef } from "react"

interface MotionWrapperProps extends MotionProps {
  className?: string;
  onClick?: () => void;
}

const MotionWrap = forwardRef<HTMLDivElement, MotionWrapperProps>(
  function MotionWrap(
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
      onClick,
      variants
    },
    ref
  ) {
    return (
      <LazyMotion features={domAnimation}>
        <m.div
          ref={ref}
          className={className}
          style={style} 
          animate={animate} 
          whileHover={whileHover} 
          whileTap={whileTap} 
          transition={transition}
          initial={initial}
          exit={exit}
          onClick={onClick}
          variants={variants}
        >
          {children}
        </m.div>
      </LazyMotion>
    )
  }
)

export default MotionWrap
