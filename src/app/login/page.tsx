import styles from './styles/login.module.css'
import LoginForm from '@/components/LoginForm'
import Link from 'next/link'

export const metadata = {
    title: 'Notes App | Login',
    description: 'login page',
}

export default function Login() {

  return (
    <main className={styles.loginPageContainer}>
      <h1 className={styles.loginHeader}>Login</h1>

      <section className={styles.formWrapper}>
        <LoginForm />

        <Link className={styles.registerPageLink} href={'/register'}>
          Already have an Account?
        </Link>
      </section>
    </main>
  )
}