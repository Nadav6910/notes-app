'use client'

import styles from '../../app/styles/home.module.css'
import { useState, useEffect } from 'react';
import { Backdrop, CircularProgress } from '@mui/material';
import MotionWrap from '../../wrappers/MotionWrap'
import { useRouter } from "next/navigation";

type Session = {
    user: {
        id: string;
        name: string;
        email?: string;
        image?: string;
    }
}

export default function MainPageButton({session}: {session: Session | null}) {

    const router = useRouter()
   
    const [pageNavLoading, setPageNavLoading] = useState(false)

    useEffect(() => {
        // Prefetch pages for faster navigation
        router.prefetch('/my-notes')
        router.prefetch('/login')
    }, [router])

    if (session === null) {
        return (
            <MotionWrap
                style={{width: "10em"}} 
                whileHover={{scale: 1.1}}
                whileTap={{ scale: 0.9 }} 
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
                <button 
                    className={styles.callToActionBtn}
                    onClick={() => {
                        setPageNavLoading(true)
                        router.push('/login')
                    }}
                >
                    Get started
                </button>
            </MotionWrap>
        )
    }
    
    return (

        <>
            {pageNavLoading && 
                <Backdrop sx={{zIndex: 999}} open={true}>
                    <CircularProgress className={styles.backDropLoader} />
                </Backdrop>
            }

            <MotionWrap
                style={{width: "10em"}} 
                whileHover={{scale: 1.1}}
                whileTap={{ scale: 0.9 }} 
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                    <button 
                        className={styles.callToActionBtn}
                        onClick={() => {
                            setPageNavLoading(true)
                            router.push('/my-notes')
                        }}
                    >
                        My Notes
                    </button>
            </MotionWrap>
        </>
    )
}
