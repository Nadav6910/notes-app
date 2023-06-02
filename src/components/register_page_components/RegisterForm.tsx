'use client'

import styles from "../../app/register/styles/register.module.css"
import { useState } from "react"
import { useForm } from 'react-hook-form'
import { signIn } from "next-auth/react"
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import { FcGoogle } from 'react-icons/fc'
import { GoMarkGithub } from 'react-icons/go'
import { CircularProgress, Snackbar, Alert } from '@mui/material'
import { BiUserPin } from 'react-icons/bi'
import { AiOutlineUser } from 'react-icons/ai'
import { RiLockPasswordLine } from 'react-icons/ri'

export default function RegisterForm() {

    const router = useRouter()
    const { resolvedTheme } = useTheme()

    const [openSuccess, setOpenSuccess] = useState(false)
    const [userExistsError, setUserExistsError] = useState(false)
    const [openError, setOpenError] = useState(false)

    const handleClose = () => {
        setOpenSuccess(true)
        router.push('/login')
    }
    
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<RegisterFormValues>()

    const Register = async (data: RegisterFormValues) => {
        
        const { name, userName, password } = data

        const res = await fetch('/api/register', {
            method: "POST",
            body: JSON.stringify({name, userName, password})
        })

        const response = await res.json()

        if (response.massage === "user created") {        
            setOpenSuccess(true)
        } 

        if (response.error === "user already exists") {
            setUserExistsError(true)
            setTimeout(() => {
                setUserExistsError(false)
            }, 2000)
        }

        else if (response.error) {
            setOpenError(true)
        }
    }
    
    return (
        <>
            <form 
                onSubmit={handleSubmit((data) => Register(data))} 
                className={styles.formContainer}
            >
                <div className={styles.inputContainer}>
                    <input 
                        className={styles.RegisterInput}
                        {...register('name', 
                        { 
                            required: {value: true, message: "Name Must Be Provided"}, 
                            minLength: {value: 2, message: "Name Must Be At Least 2 characters"} 
                        })} 
                        type='text'
                        placeholder='Name'
                        
                        style={{borderColor: errors.name && "red"}} 
                    />
                    <div className={styles.inputIcon}><BiUserPin /></div>
                </div>
                {
                    errors.name &&
                    <span style={{color: "red", fontSize: "0.8rem"}}>
                        {errors.name?.message}
                    </span>
                }

                <div className={styles.inputContainer}>
                    <input 
                        className={styles.RegisterInput}
                        {...register('userName', 
                        { 
                            required: {value: true, message: "Username Must Be Provided"}, 
                            minLength: {value: 3, message: "Username Must Be At Least 3 characters"} 
                        })} 
                        type='text'
                        placeholder='Username'
                        
                        style={{borderColor: errors.userName || userExistsError ? "red" : "initial"}} 
                    />
                    <div className={styles.inputIcon}><AiOutlineUser /></div>
                </div>
                {
                    errors.userName || userExistsError ?
                    <span style={{color: "red", fontSize: "0.8rem"}}>
                        {errors.userName?.message ?? "This username is already taken!"}
                    </span> : null
                }

                <div className={styles.inputContainer}>
                    <input 
                        className={styles.RegisterInput}
                        {...register('password', 
                        { 
                            required: {value: true, message: "Password Must Be Provided"}, 
                            minLength: {value: 8, message: "Password Must Be At Least 8 characters"},
                            pattern: {
                                value: /^(?=.*[a-zA-Z])(?=.*\d).+$/, 
                                message: "Password Must Contain 1 Letter And 1 Digit"
                            }
                        })} 
                        type='password'
                        placeholder='Password'
                        style={{borderColor: errors.password && "red"}} 
                    />
                    <div className={styles.inputIcon}><RiLockPasswordLine /></div>
                </div>
                {
                    errors.password && 
                    <span style={{color: "red", fontSize: "0.8rem"}}>
                        {errors.password?.message ?? "Password is incorrect!"}
                    </span>
                }

                <button className={styles.RegisterSubmitBtn} type='submit'>
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
                        /> : "Register"
                    }
                </button>

                <section className={styles.socialRegisterSection}>

                    <hr className={styles.divider} />
                    <p>Or Continue In With</p>
                    <hr className={styles.divider} />

                </section>

                <section className={styles.socialBtnsContainer}>
                    <div onClick={() => signIn('google')} className={styles.googleRegisterWrapper}>
                        <FcGoogle style={{width: "1.7em", height: "1.7em"}} />
                    </div>
                    <div onClick={() => signIn('github')} className={styles.googleRegisterWrapper}>
                        <GoMarkGithub style={{width: "1.7em", height: "1.7em", color: "#171515"}} />
                    </div>
                </section>
            </form>

            <Snackbar
                open={openSuccess}
                autoHideDuration={2500}
                onClose={handleClose}
                anchorOrigin={{horizontal: "center", vertical: "bottom"}}
            >
                <Alert onClose={handleClose} severity="success" sx={{ width: '100%' }}>
                    User created successfully!
                </Alert>
            </Snackbar>

            <Snackbar
                open={openError}
                autoHideDuration={2500}
                onClose={() => setOpenError(false)}
                anchorOrigin={{horizontal: "center", vertical: "bottom"}}
            >
                <Alert onClose={() => setOpenError(false)} severity="error" sx={{ width: '100%' }}>
                    Something went wrong during registration, please try again later!
                </Alert>
            </Snackbar>
        </>
    )
}
