import './globals.css'
import { inter } from '../fonts/fonts'
import { SessionProv } from '../providers/SessionProv'
import { ThemeProv } from '@/providers/ThemeProv'
import AppNavbar from '@/components/main_components/AppNavbar'
import { BasicChildrenProps } from '../../types'
// import AppFooter from '@/components/main_components/AppFooter'

export const metadata = {
  title: 'Notes App | Home',
  description: 'An app for taking notes for everything',
}

export default function RootLayout({children}: BasicChildrenProps) {
  
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body 
        className={inter.className} 
      >
        <SessionProv>
          <ThemeProv>
            {/* @ts-expect-error Server Component */}
            <AppNavbar />
            {children}
            {/* <AppFooter />    */}
          </ThemeProv>
        </SessionProv>
      </body>
    </html>
  )
}
