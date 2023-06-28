'use client'

import styles from '../../app/styles/home.module.css'
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Backdrop, CircularProgress } from '@mui/material';
import MotionWrap from '../../wrappers/MotionWrap'
import { useRouter } from "next/navigation";

export default function MainPageButton() {

    const router = useRouter()
    const session = useSession()
   
    const [pageNavLoading, setPageNavLoading] = useState(false)

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
                            router.push(session.data ? '/my-notes' : '/login')
                        }}
                    >
                        {session.data ? 'My Notes' : 'Get started'}
                    </button>
            </MotionWrap>
        </>
    )
}
