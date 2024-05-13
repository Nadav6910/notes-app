'use client'

import styles from "../../app/my-notes/create/styles/createNote.module.css"
import { useState } from "react";
import MotionWrap from "@/wrappers/MotionWrap";
import { useAnimationControls } from "framer-motion"
import { NoteTypeSelectorProps } from "../../../types";

export default function NoteTypeSelector({createdNoteType}: NoteTypeSelectorProps) {

    const [selectedNoteType, setSelectedNoteType] = useState("Items list")

    const controls = useAnimationControls()

    const toggleButton = (e: React.MouseEvent) => {

        if (e.currentTarget.childNodes[0].textContent === "Items list") {
            controls.start({left: "0.5em"})
            setSelectedNoteType("Items list")
            createdNoteType("Items list")
        }

        if (e.currentTarget.childNodes[0].textContent === "Note book") {
            controls.start({left: "6.75em"})
            setSelectedNoteType("Note book")
            createdNoteType("Note book")
        }
    }
    
    return (

        <div className={styles.noteTypeSelectorContainer}>
            <MotionWrap
                className={selectedNoteType === "Items list" ? styles.typeSelectionAreaList : styles.typeSelectionAreaBook}
                animate={controls}       
                transition={{ type: "spring", stiffness: 160, damping: 19, duration: 0.5, bounce: 0.2}}
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