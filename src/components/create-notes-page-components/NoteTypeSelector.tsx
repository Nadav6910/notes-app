'use client'

import styles from "../../app/my-notes/create/styles/createNote.module.css"
import MotionWrap from "@/wrappers/MotionWrap";
import { useAnimationControls } from "framer-motion"

export default function NoteTypeSelector({createdNoteType}: NoteTypeSelectorProps) {

  const controls = useAnimationControls()

  const toggleButton = (e: React.MouseEvent) => {

    if (e.currentTarget.childNodes[0].textContent === "Items list") {
        controls.start({x: 1})
        createdNoteType("Items list")
    }

    if (e.currentTarget.childNodes[0].textContent === "Note book") {
        controls.start({x: 97})
        createdNoteType("Note book")
    }
  }
  
  return (

    <div className={styles.noteTypeSelectorContainer}>
        <MotionWrap
            className={styles.typeSelectionArea}
            animate={controls}             
            transition={{ type: "spring", stiffness: 200, damping: 20, duration: 0.6, bounce: 0.2}}
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