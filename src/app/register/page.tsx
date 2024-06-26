import styles from "../../app/register/styles/register.module.css"
import RegisterForm from "../../components/register_page_components/RegisterForm"
import Link from 'next/link'
import { getServerSession } from "next-auth/next"
import { authOptions } from '../api/auth/[...nextauth]/options'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Notes App | Register',
  description: 'register page',
}

export default async function Register() {

  const session = await getServerSession(authOptions)

  if (session) {
    redirect('/')
  }

  return (
    <main className={styles.RegisterPageContainer}>
        <h2 className={styles.RegisterHeader}>Register</h2>

        <section className={styles.formWrapper}>
            <RegisterForm />

            <Link className={styles.loginPageLink} href={'/login'}>
                Already have an Account?
            </Link>
        </section>
    </main>
  )
}