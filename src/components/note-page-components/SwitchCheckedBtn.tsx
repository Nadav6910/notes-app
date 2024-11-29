'use client'

import styles from "../../app/my-notes/note/[noteId]/styles/notePage.module.css";
import { MdOutlineRemoveDone, MdOutlineDoneAll } from "react-icons/md";
import MotionWrap from "@/wrappers/MotionWrap";

export default function SwitchCheckedBtn({
  changeFilterView,
  currentFilterView,
}: {
  changeFilterView: (view: string) => void;
  currentFilterView: string;
}) {

  const variants = {
    hidden: {
      scaleX: 0,
      opacity: 0,
      originX: 0.5,
    },
    checked: {
      scaleX: 1,
      opacity: 1,
      originX: 0,
      borderTopLeftRadius: "9px",
      borderBottomLeftRadius: "9px",
      borderTopRightRadius: "0px",
      borderBottomRightRadius: "0px",
    },
    unchecked: {
      scaleX: 1,
      opacity: 1,
      originX: 1,
      borderTopRightRadius: "9px",
      borderBottomRightRadius: "9px",
      borderTopLeftRadius: "0px",
      borderBottomLeftRadius: "0px",
    },
  }

  const checkedSwitch = () => {
    if (currentFilterView !== "checked") {
      changeFilterView("checked");
    }
  }

  const uncheckedSwitch = () => {
    if (currentFilterView !== "unchecked") {
      changeFilterView("unchecked");
    }
  }

  return (
    <div className={styles.switchNoteViewBtnContainer}>
      <MotionWrap
        className={
          currentFilterView !== "checked" && currentFilterView !== "unchecked"
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
          stiffness: 150,
          damping: 20,
          duration: 0.4,
          bounce: 0.1,
        }}
      />

      <div
        className={styles.checkedFilterViewBtnContainer}
        onClick={checkedSwitch}
      >
        <MdOutlineDoneAll />
      </div>
      <div className={styles.divider} />
      <div
        className={styles.uncheckedFilterViewBtnContainer}
        onClick={uncheckedSwitch}
      >
        <MdOutlineRemoveDone />
      </div>
    </div>
  )
}