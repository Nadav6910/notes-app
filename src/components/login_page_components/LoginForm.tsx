'use client'

import styles from '../../app/login/styles/login.module.css'
import { useForm } from 'react-hook-form'
import { FcGoogle } from 'react-icons/fc'

export default function LoginForm() {

    const {
        register,
        handleSubmit,
        formState: { errors },
      } = useForm<LoginFormValues>()

    const login = (data: LoginFormValues) => {
        
        const { userName, password } = data

        console.log(userName, password)
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
                    minLength: {value: 3, message: "Username Must Be At Least 3 characters"} 
                })} 
                type='text'
                placeholder='Username'
                
                style={{borderColor: errors.userName && "red"}} 
            />
            {
                errors.userName && 
                <span style={{color: "red", fontSize: "0.8rem"}}>
                    {errors.userName?.message}
                </span>
            }

            <input 
                className={styles.loginInput}
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
                    {errors.password?.message}
                </span>
            }
            <p className={styles.forgotPassLink}>Forgot Password?</p>

            <input className={styles.loginSubmitBtn} type='submit' value='Log In' />

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