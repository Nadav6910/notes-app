'use client'

import styles from '../../app/login/styles/login.module.css'
import LoginForm from '../../components/login_page_components/LoginForm'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSession } from "next-auth/react"
import { useTheme } from 'next-themes'
import { CircularProgress } from '@mui/material'
import { redirect } from 'next/navigation'

export default function LoginPageWrapper() {

    const { status } = useSession()
    const { resolvedTheme } = useTheme()

    const [theme, setTheme] = useState<string | undefined>("")

    useEffect(() => setTheme(resolvedTheme), [resolvedTheme])
    
    if (status === "loading") {

        return (
            <div style={
                    {
                        display: "flex", 
                        alignItems: "center",
                        justifyContent: "center", 
                        gap: "1em", 
                        marginTop: "15em", 
                        marginBottom: "16em"
                    }
                }
            >
                <CircularProgress sx={
                    {width: "2em !important", 
                    height: "2em !important", 
                    color: theme === 'light' ? "#610c62" : "#19a29b"}} 
                />
                <h2>Loading...</h2>
            </div>
        )
    }

    if (status === "authenticated") {
        redirect('/')
    }

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