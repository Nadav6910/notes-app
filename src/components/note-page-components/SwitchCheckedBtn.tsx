'use client'

import styles from "../../app/my-notes/note/[noteId]/styles/notePage.module.css";
import { MdOutlineRemoveDone, MdOutlineDoneAll } from "react-icons/md";
import MotionWrap from "@/wrappers/MotionWrap";
import { Tooltip } from "@mui/material";
import { m, LazyMotion, domAnimation } from "framer-motion";
import { useState } from "react";

export default function SwitchCheckedBtn({
  changeFilterView,
  currentFilterView
}: {
  changeFilterView: (view: string) => void
  currentFilterView: string
}) {

  const [hoveredButton, setHoveredButton] = useState<string | null>(null)

  const variants = {
    hidden: {
      scaleX: 0,
      opacity: 0,
      originX: 0.5
    },
    checked: {
      scaleX: 1,
      opacity: 1,
      originX: 0,
      borderTopLeftRadius: "9px",
      borderBottomLeftRadius: "9px",
      borderTopRightRadius: "0px",
      borderBottomRightRadius: "0px"
    },
    unchecked: {
      scaleX: 1,
      opacity: 1,
      originX: 1,
      borderTopRightRadius: "9px",
      borderBottomRightRadius: "9px",
      borderTopLeftRadius: "0px",
      borderBottomLeftRadius: "0px"
    }
  }

  const checkedSwitch = () => {
    if (currentFilterView !== "checked") {
      changeFilterView("checked")
    }
  }

  const uncheckedSwitch = () => {
    if (currentFilterView !== "unchecked") {
      changeFilterView("unchecked")
    }
  }

  const isEitherSelected = currentFilterView === "checked" || currentFilterView === "unchecked"

  return (
    <LazyMotion features={domAnimation}>
      <div className={isEitherSelected ? styles.filterNoteItemsSwitchBtnContainerSelected : styles.filterNoteItemsSwitchBtnContainer}>
        <MotionWrap
          className={
            !isEitherSelected
              ? styles.notSelectedArea
              : currentFilterView === "checked"
              ? styles.selectedAreaRegular
              : styles.selectedAreaCategories
          }
          variants={variants}
          initial="hidden"
          animate={
            currentFilterView === "checked"
              ? "checked"
              : currentFilterView === "unchecked"
              ? "unchecked"
              : "hidden"
          }
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 25,
          }}
        />

        <Tooltip title="Show completed" arrow placement="top" enterDelay={400}>
          <m.div
            className={styles.checkedFilterViewBtnContainer}
            onClick={checkedSwitch}
            animate={hoveredButton === "checked" && currentFilterView !== "checked" ? {
              y: 3,
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.15)'
            } : {
              y: 0,
              boxShadow: '0 0 0px rgba(0, 0, 0, 0)'
            }}
            transition={{
              type: "spring",
              stiffness: 150,
              damping: 15,
              mass: 0.8
            }}
            onHoverStart={() => setHoveredButton("checked")}
            onHoverEnd={() => setHoveredButton(null)}
          >
            <MdOutlineDoneAll 
              className={currentFilterView === "checked" ? styles.selectedCheckIcon : "none"} 
              style={{ fontSize: '1.1rem' }}
            />
          </m.div>
        </Tooltip>
        <div 
          className={isEitherSelected ? styles.dividerSelected : styles.divider} 
        />
        <Tooltip title="Show pending" arrow placement="top" enterDelay={400}>
          <m.div
            className={styles.uncheckedFilterViewBtnContainer}
            onClick={uncheckedSwitch}
            animate={hoveredButton === "unchecked" && currentFilterView !== "unchecked" ? {
              y: 3,
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.15)'
            } : {
              y: 0,
              boxShadow: '0 0 0px rgba(0, 0, 0, 0)'
            }}
            transition={{
              type: "spring",
              stiffness: 150,
              damping: 15,
              mass: 0.8
            }}
            onHoverStart={() => setHoveredButton("unchecked")}
            onHoverEnd={() => setHoveredButton(null)}
          >
            <MdOutlineRemoveDone 
              className={currentFilterView === "unchecked" ? styles.selectedUncheckIcon : "none"} 
              style={{ fontSize: '1.1rem' }}
            />
          </m.div>
        </Tooltip>
      </div>
    </LazyMotion>
  )
}