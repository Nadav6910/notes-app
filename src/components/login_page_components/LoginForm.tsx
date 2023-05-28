'use client'

import styles from '../../app/login/styles/login.module.css'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { signIn } from "next-auth/react"
import { useTheme } from 'next-themes'
import { FcGoogle } from 'react-icons/fc'
import { CircularProgress } from '@mui/material'
import { useRouter } from 'next/navigation'

export default function LoginForm() {

    const router = useRouter()

    const [userNameErr, setUserNameErr] = useState(false)
    const [passwordErr, setPasswordErr] = useState(false)

    const { resolvedTheme } = useTheme()

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormValues>()

    const login = async (data: LoginFormValues) => {
        
        const { userName, password } = data

        const loginResponse = await signIn('credentials', {
            userName: userName,
            password: password,
            redirect: false
        })
        
        if (loginResponse?.error === 'wrong user name') {
            setUserNameErr(true)
            setTimeout(() => {
                setUserNameErr(false)
            }, 2000)
        }

        if (loginResponse?.error === 'wrong password') {
            setPasswordErr(true)
            setTimeout(() => {
                setPasswordErr(false)
            }, 2000)
        }

        else {
            router.refresh()
        }
    }
    
    return (
        <form 
            onSubmit={handleSubmit((data) => login(data))} 
            className={styles.formContainer}
        >
            <input 
                className={styles.loginInput}
                {...register('userName', 
                { 
                    required: {value: true, message: "Username Must Be Provided"}, 
                })} 
                type='text'
                placeholder='Username'
                
                style={{borderColor: errors.userName || userNameErr ? "red" : "initial"}} 
            />
            {
                errors.userName || userNameErr ?
                <span style={{color: "red", fontSize: "0.8rem"}}>
                    {errors.userName?.message ?? "Username is incorrect!"}
                </span> : null
            }

            <input 
                className={styles.loginInput}
                {...register('password', 
                { 
                    required: {value: true, message: "Password Must Be Provided"}, 
                })} 
                type='password'
                placeholder='Password'
                style={{borderColor: errors.password || passwordErr ? "red" : "initial"}} 
            />
            {
                errors.password || passwordErr ? 
                <span style={{color: "red", fontSize: "0.8rem"}}>
                    {errors.password?.message ?? "Password is incorrect!"}
                </span> : null
            }
            <p className={styles.forgotPassLink}>Forgot Password?</p>

            <button className={styles.loginSubmitBtn} type='submit'>
                {
                    isSubmitting ?
                    
                    <CircularProgress 
                        sx={
                            {
                                width: "1.2em !important", 
                                height: "1.2em !important", 
                                color: resolvedTheme === 'dark' ? "#19a29b" : "#610c62"
                            }
                        } 
                    /> : "Log in"
                }
            </button>

            <section className={styles.socialLoginSection}>

                <hr className={styles.divider} />
                <p>Or Log In With</p>
                <hr className={styles.divider} />

            </section>

            <section className={styles.socialBtnsContainer}>
                <div className={styles.googleLoginWrapper}>
                    <FcGoogle style={{width: "1.7em", height: "1.7em"}} />
                </div>
            </section>
        </form>
    )
}