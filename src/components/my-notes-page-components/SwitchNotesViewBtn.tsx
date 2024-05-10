'use client'

import styles from "../../app/my-notes/note/[noteId]/styles/notePage.module.css"
import { TfiLayoutMenuV } from "react-icons/tfi"
import { TbCategory } from "react-icons/tb"
import MotionWrap from "@/wrappers/MotionWrap"
import { useAnimationControls } from "framer-motion"

export default function SwitchNotesViewBtn(
    {changeNotesView, currentNotesView}: {changeNotesView: (view: string) => void, currentNotesView: string | undefined}
) {

    const controls = useAnimationControls()
    
    const cardViewSwitch = () => {

        if (currentNotesView !== "card") {
            controls.start({
                left: "unset",
                right: 0, 
                borderTopRightRadius: "9px", 
                borderBottomRightRadius: "9px", 
                borderTopLeftRadius: "0px", 
                borderBottomLeftRadius: "0px"
            })
           
            changeNotesView("card")
        }
    }

    const listViewSwitch = () => {
        
        if (currentNotesView !== "list") {
                        controls.start({
                left: 0, 
                borderTopLeftRadius: "9px", 
                borderBottomLeftRadius: "9px", 
                borderTopRightRadius: "0px", 
                borderBottomRightRadius: "0px"
            })
           
            changeNotesView("list")
        }
    }

    return (

        <div className={styles.switchNotesViewBtnContainer}>
            <MotionWrap 
                className={currentNotesView === "card" ? styles.selectedAreaCategories : styles.selectedAreaRegular}
                animate={controls}             
                transition={{ type: "spring", stiffness: 150, damping: 20, duration: 0.4, bounce: 0.1}}
            />

            <div className={styles.regularViewBtnContainer} onClick={listViewSwitch}>
                <TfiLayoutMenuV />
            </div>
            <div className={styles.categoriesViewBtnContainer} onClick={cardViewSwitch}>
                <TbCategory />
            </div>
        </div>
    )
}