import './globals.css'
import { inter } from '../fonts/fonts'
import AppNavbar from '@/components/AppNavbar'
import { ThemeProv } from '@/providers/ThemeProv'

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
    <html lang="en" suppressHydrationWarning={true}>
      <body 
        className={inter.className} 
      >
        <ThemeProv>
          <AppNavbar />
          {children}
        </ThemeProv>
      </body>
    </html>
  )
}
