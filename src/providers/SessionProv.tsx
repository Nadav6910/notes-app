'use client'

import { SessionProvider } from 'next-auth/react'

export function SessionProv({ children }: BasicChildrenProps) {
  return <SessionProvider>{children}</SessionProvider>
}