'use client'

import styles from "../../app/my-notes/note/[noteId]/styles/notePage.module.css"
import { TfiLayoutMenuV } from "react-icons/tfi"
import { TbCategory } from "react-icons/tb"
import MotionWrap from "@/wrappers/MotionWrap"
import { useAnimationControls } from "framer-motion"

export default function SwitchNoteViewBtn({changeNoteView, currentNoteView}: {changeNoteView: (view: string) => void, currentNoteView: string}) {

    const controls = useAnimationControls()
    
    const regularViewSwitch = () => {

        if (currentNoteView !== "regular") {
            controls.start({
                left: 0, 
                borderTopLeftRadius: "9px", 
                borderBottomLeftRadius: "9px", 
                borderTopRightRadius: "0px", 
                borderBottomRightRadius: "0px"
            })
           
            changeNoteView("regular")
        }
    }

    const categoriesViewSwitch = () => {

        if (currentNoteView !== "categories") {
            controls.start({
                left: "unset",
                right: 0, 
                borderTopRightRadius: "9px", 
                borderBottomRightRadius: "9px", 
                borderTopLeftRadius: "0px", 
                borderBottomLeftRadius: "0px"
            })
           
            changeNoteView("categories")
        }
    }

    return (

        <div className={styles.switchNoteViewBtnContainer}>
            <MotionWrap 
                className={currentNoteView === "regular" ? styles.selectedAreaRegular : styles.selectedAreaCategories}
                animate={controls}             
                transition={{ type: "spring", stiffness: 150, damping: 20, duration: 0.4, bounce: 0.1}}
            />

            <div className={styles.regularViewBtnContainer} onClick={regularViewSwitch}>
                <TfiLayoutMenuV />
            </div>
            <div className={styles.categoriesViewBtnContainer} onClick={categoriesViewSwitch}>
                <TbCategory />
            </div>
        </div>
    )
}
