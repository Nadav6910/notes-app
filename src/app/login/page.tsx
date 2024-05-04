import styles from '../../app/login/styles/login.module.css'
import LoginForm from '../../components/login_page_components/LoginForm'
import Link from 'next/link'
import { getServerSession } from "next-auth/next"
import { authOptions } from '../api/auth/[...nextauth]/options'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Notes App | Login',
  description: 'login page',
}

export default async function Login() {

  const session = await getServerSession(authOptions)

  if (session) {
    redirect('/')
  }

    return (
      <main className={styles.loginPageContainer}>
          <h2 className={styles.loginHeader}>Login</h2>

          <section className={styles.formWrapper}>
              <LoginForm />

              <Link className={styles.registerPageLink} href={'/register'}>
                  Don&apos;t have an Account?
              </Link>
          </section>
      </main>
    )
}