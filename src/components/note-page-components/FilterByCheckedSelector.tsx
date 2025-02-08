import styles from "../../app/my-notes/note/[noteId]/styles/notePage.module.css"
import { FilterByCheckedSelectorProps } from "../../../types";
import { useState } from "react";
import MotionWrap from "@/wrappers/MotionWrap";
import useMediaQuery from "@/app/hooks/useMediaQuery";
import SwitchCheckedBtn from "./SwitchCheckedBtn";

export default function FilterByCheckedSelector({filterByChecked}: FilterByCheckedSelectorProps) {

    const [selectedFilter, setSelectedFilter] = useState("All")

    const handleSelectFilter = (filter: string) => {
        setSelectedFilter(filter)
        filterByChecked(filter)
    }
    
    // This is a custom hook that returns a boolean value based on the width of the screen
    const breakPoint = useMediaQuery(850)
    
    return (
        <div className={styles.filterSelectorContainer}>
            <MotionWrap
                whileHover={{ y: breakPoint ? 0 : 2 }}
                transition={{duration: 0.2, type: "spring", stiffness: 120, damping: 20}}
            >
                <div 
                    className={`${styles.categoryBox} ${selectedFilter === "All" && styles.categoryBoxSelected}`}
                    onClick={() => handleSelectFilter("All")}
                >
                    All
                </div>
            </MotionWrap>
            <MotionWrap
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ y: breakPoint ? 0 : 2 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{duration: 0.2, type: "spring", stiffness: 120, damping: 20}}
            >
                <SwitchCheckedBtn 
                    changeFilterView={(filter) => handleSelectFilter(filter)} 
                    currentFilterView={selectedFilter}
                />
            </MotionWrap>
        </div>
    )
}