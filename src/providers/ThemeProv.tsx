'use client'

import { ThemeProvider } from 'next-themes'

export function ThemeProv({ children }: BasicChildrenProps) {
  return <ThemeProvider>{children}</ThemeProvider>
}