'use client'

import { ThemeProvider } from 'next-themes'
import { BasicChildrenProps } from '../../types'

export function ThemeProv({ children }: BasicChildrenProps) {
  return <ThemeProvider>{children}</ThemeProvider>
}