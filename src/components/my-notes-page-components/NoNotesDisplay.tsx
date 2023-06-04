'use client'

import styles from "../../app/my-notes/styles/myNotes.module.css"
import { useState } from "react"
import Lottie from 'lottie-react'
import animationData from '../../../public/emptyList.json'
import Link from 'next/link'
import { MdAssignmentAdd } from 'react-icons/md'
import MotionWrap from '../../wrappers/MotionWrap'

export default function NoNotesDisplay() {

    const [animationLoaded, setAnimationLoaded] = useState(false)
    
    return (
        
        <div style={{marginBottom: animationLoaded ? 0 : "18em"}}>
            <Lottie 
                onDOMLoaded={() => setAnimationLoaded(true)} 
                className={styles.lottieAnimationNoNotes}  
                animationData={animationData} 
            />
            <div 
                style={{marginTop: animationLoaded ? 0 : "18em"}} 
                className={styles.addNotesLinkContainer}
            >
                <p>No notes added yet..</p>
                <MotionWrap
                    style={{borderRadius: "10px"}}
                    whileHover={{y: -4, boxShadow: "6px 7px 13px #2a2929"}}
                    transition={{ 
                        type: "spring", 
                        stiffness: 300, 
                        damping: 10, 
                        duration: 0.5, 
                        bounce: 1, 
                        mass: 1.3
                    }}
                >
                    <div className={styles.addNotesLinkWrapper}>
                        <MdAssignmentAdd className={styles.addIcon} />
                        <Link className={styles.addNotesLink} href={'/my-notes/create'}>Add notes</Link>
                    </div>
                </MotionWrap>
            </div>
        </div>
    )
}
