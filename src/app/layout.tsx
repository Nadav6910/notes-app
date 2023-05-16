import './globals.css'
import { inter } from '../fonts/fonts'
import { ThemeProv } from '@/providers/ThemeProv'
import AppNavbar from '@/components/AppNavbar'
import AppFooter from '@/components/AppFooter'

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

          <AppFooter />
          
        </ThemeProv>
      </body>
    </html>
  )
}
