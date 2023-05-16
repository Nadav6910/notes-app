'use client'

import { ThemeProvider } from 'next-themes'

export function ThemeProv({ children }: ThemeProvProps) {
  return <ThemeProvider>{children}</ThemeProvider>
}