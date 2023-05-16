'use client'

import styles from '../app/login/styles/login.module.css'
import { useTheme } from 'next-themes'
import { Divider, IconButton } from '@mui/material'
import { FcGoogle } from 'react-icons/fc'

export default function LoginForm() {

    const { theme } = useTheme()

  return (
    <form className={styles.formContainer} action="">
        <input 
            className={styles.loginInput} 
            type='text'
            placeholder='Username' 
        />
        <input 
            className={styles.loginInput} 
            type='password'
            placeholder='Password' 
        />
        <input className={styles.loginSubmitBtn} type='submit' value='Log In' />

        <section className={styles.socialLoginSection}>

            <hr className={styles.divider} />
            <p>Or Log In With</p>
            <hr className={styles.divider} />

        </section>

        <section className={styles.socialBtnsContainer}>
            <IconButton
                sx={{
                    backgroundColor: "white", 
                    width: "2em", 
                    height: "2em"
                }}
            >
                <FcGoogle />
            </IconButton>
        </section>
    </form>
  )
}