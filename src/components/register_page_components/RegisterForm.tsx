'use client'

import styles from "../../app/register/styles/register.module.css"
import { useForm } from 'react-hook-form'
import { useTheme } from 'next-themes'
import { FcGoogle } from 'react-icons/fc'
import { CircularProgress } from '@mui/material'

export default function RegisterForm() {

    const { resolvedTheme } = useTheme()

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<RegisterFormValues>()

    const Register = async (data: RegisterFormValues) => {
        
        const { name, userName, password } = data

        fetch('/api/register', {
            method: "POST",
            body: JSON.stringify({name, userName, password})
        })
    }
    
    return (

        <form 
            onSubmit={handleSubmit((data) => Register(data))} 
            className={styles.formContainer}
        >

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
            {
                errors.name &&
                <span style={{color: "red", fontSize: "0.8rem"}}>
                    {errors.name?.message}
                </span>
            }

            <input 
                className={styles.RegisterInput}
                {...register('userName', 
                { 
                    required: {value: true, message: "Username Must Be Provided"}, 
                    minLength: {value: 3, message: "Username Must Be At Least 3 characters"} 
                })} 
                type='text'
                placeholder='Username'
                
                style={{borderColor: errors.userName && "red"}} 
            />
            {
                errors.userName &&
                <span style={{color: "red", fontSize: "0.8rem"}}>
                    {errors.userName?.message ?? "Username is incorrect!"}
                </span>
            }

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
                <div className={styles.googleRegisterWrapper}>
                    <FcGoogle style={{width: "1.7em", height: "1.7em"}} />
                </div>
            </section>
        </form>
    )
}
