import './globals.css'
import { Inter } from 'next/font/google'
import AppNavbar from '@/components/AppNavbar'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Notes App | Home',
  description: 'An app for taking notes for everything',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AppNavbar />
        {children}
      </body>
    </html>
  )
}
