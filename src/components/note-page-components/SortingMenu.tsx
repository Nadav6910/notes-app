import styles from "../../app/my-notes/note/[noteId]/styles/notePage.module.css"
import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import MotionWrap from "@/wrappers/MotionWrap"
import { AiOutlineCheck } from "react-icons/ai"
import { SortingMenuProps } from "../../../types"
import { TbSortDescending } from "react-icons/tb"
import { ClickAwayListener } from '@mui/base/ClickAwayListener'

export default function SortingMenu({sortMethod, sortByNewToOld, sortByOldToNew, sortByPriority, sortByChecked, sortByName}: SortingMenuProps) {

    const [openSortingMenu, setOpenSortingMenu] = useState<boolean>(false)

    return (

        <ClickAwayListener onClickAway={() => setOpenSortingMenu(false)}>

            <div style={{position: "relative"}}>

                <div 
                    onClick={() => setOpenSortingMenu(!openSortingMenu)} 
                    className={styles.sortBtn}
                >
                    <TbSortDescending />
                    <p>Sort</p>
                </div>

                <AnimatePresence>
                    {openSortingMenu &&

                    <MotionWrap 
                        className={styles.sortingMenu}
                        initial={{opacity: 0, x: -10}}
                        animate={{opacity: 1, x: 0}}
                        exit={{opacity: 0, x: -10}}
                        transition={{duration: 0.3, type: "spring", stiffness: 100, damping: 20}}
                    >
                        <ul className={styles.sortingMenuList}>
                        <li className={styles.sortingMenuListItem} onClick={() => {
                            setOpenSortingMenu(false)
                            sortByNewToOld()
                        }}>
                            New to old
                            <span style={{width: "1em", height: "1em"}}>
                            {sortMethod === "newToOld" && <AiOutlineCheck />}
                            </span>
                        </li>
                        <li className={styles.sortingMenuListItem} onClick={() => {
                            setOpenSortingMenu(false)
                            sortByOldToNew()
                        }}>
                            Old to new
                            <span style={{width: "1em", height: "1em"}}>
                            {sortMethod === "oldToNew" && <AiOutlineCheck />}
                            </span>
                        </li>
                        <li className={styles.sortingMenuListItem} onClick={() => {
                            setOpenSortingMenu(false)
                            sortByPriority()
                        }}>
                            By priority
                            <span style={{width: "1em", height: "1em"}}>
                            {sortMethod === "byPriority" && <AiOutlineCheck />}
                            </span>
                        </li>
                        <li className={styles.sortingMenuListItem} onClick={() => {
                            setOpenSortingMenu(false)
                            sortByChecked()
                        }}>
                            By Checked
                            <span style={{width: "1em", height: "1em"}}>
                            {sortMethod === "byChecked" && <AiOutlineCheck />}
                            </span>
                        </li>
                        <li className={styles.sortingMenuListItem} onClick={() => {
                            setOpenSortingMenu(false)
                            sortByName()
                        }}>
                            By name
                            <span style={{width: "1em", height: "1em"}}>
                            {sortMethod === "byName" && <AiOutlineCheck />}
                            </span>
                        </li>
                        </ul>
                    </MotionWrap>
                    }
                </AnimatePresence>
            </div>
        </ClickAwayListener>
    )
}