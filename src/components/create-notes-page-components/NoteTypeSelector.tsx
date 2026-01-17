'use client'

import styles from "../../app/my-notes/create/styles/createNote.module.css"
import { useState } from "react";
import MotionWrap from "@/wrappers/MotionWrap";
import { useAnimationControls } from "framer-motion"
import { NoteTypeSelectorProps } from "../../../types";
import useMediaQuery from "@/app/hooks/useMediaQuery";

export default function NoteTypeSelector({createdNoteType}: NoteTypeSelectorProps) {

    const [selectedNoteType, setSelectedNoteType] = useState("Items list")

    const controls = useAnimationControls()

    const breakPoint = useMediaQuery(450)

    const toggleButton = (e: React.MouseEvent) => {

        if (e.currentTarget.childNodes[0].textContent === "Items list") {
            controls.start({
                left: "0.5em",
                transition: { 
                    type: "spring", 
                    stiffness: 250, 
                    damping: 12, 
                    mass: 0.8,
                    bounce: 0.5
                }
            })
            setSelectedNoteType("Items list")
            createdNoteType("Items list")
        }

        if (e.currentTarget.childNodes[0].textContent === "Note book") {
            const leftPosition = breakPoint ? "7.3em" : "7em"
            controls.start({
                left: leftPosition,
                transition: { 
                    type: "spring", 
                    stiffness: 250, 
                    damping: 12, 
                    mass: 0.8,
                    bounce: 0.5
                }
            })
            setSelectedNoteType("Note book")
            createdNoteType("Note book")
        }
    }
    
    return (

        <div className={styles.noteTypeSelectorContainer}>
            <MotionWrap
                className={selectedNoteType === "Items list" ? styles.typeSelectionAreaList : styles.typeSelectionAreaBook}
                animate={controls}       
            />
            <div 
                onClick={toggleButton} 
                className={styles.btnWrapper}
            >
                <button  
                    className={styles.typeSelectorBtn}
                >
                    Items list
                </button>
            </div>

            <div 
                onClick={toggleButton} 
                className={styles.btnWrapper}
            >
                <button 
                    className={styles.typeSelectorBtn}
                >
                    Note book
                </button>
            </div>
        </div>
    )
}