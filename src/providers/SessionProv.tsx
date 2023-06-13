'use client'

import { SessionProvider } from 'next-auth/react'
import { BasicChildrenProps } from '../../types'

export function SessionProv({ children }: BasicChildrenProps) {
  return <SessionProvider>{children}</SessionProvider>
}