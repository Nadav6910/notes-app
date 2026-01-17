import styles from "../../app/my-notes/note/[noteId]/styles/notePage.module.css"
import { FilterByCheckedSelectorProps } from "../../../types";
import { useState } from "react";
import MotionWrap from "@/wrappers/MotionWrap";
import useMediaQuery from "@/app/hooks/useMediaQuery";
import SwitchCheckedBtn from "./SwitchCheckedBtn";
import { TbLayoutList } from "react-icons/tb";
import { m, LazyMotion, domAnimation } from "framer-motion";

export default function FilterByCheckedSelector({filterByChecked}: FilterByCheckedSelectorProps) {

    const [selectedFilter, setSelectedFilter] = useState("All")
    const [hoveredButton, setHoveredButton] = useState<string | null>(null)

    const handleSelectFilter = (filter: string) => {
        setSelectedFilter(filter)
        filterByChecked(filter)
    }
    
    // This is a custom hook that returns a boolean value based on the width of the screen
    const breakPoint = useMediaQuery(850)
    
    return (
        <LazyMotion features={domAnimation}>
            <div className={styles.filterSelectorContainer}>
                <m.div
                    whileTap={{ scale: 0.95 }}
                    animate={hoveredButton === "all" && selectedFilter !== "All" ? {
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
                    onHoverStart={() => setHoveredButton("all")}
                    onHoverEnd={() => setHoveredButton(null)}
                >
                    <div 
                        className={`${styles.categoryBox} ${selectedFilter === "All" && styles.categoryBoxSelectedAll}`}
                        onClick={() => handleSelectFilter("All")}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3em' }}
                    >
                        <TbLayoutList style={{ fontSize: '1.15rem' }} />
                        All
                    </div>
                </m.div>
                <MotionWrap
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{duration: 0.2, type: "spring", stiffness: 120, damping: 20}}
                >
                    <SwitchCheckedBtn 
                        changeFilterView={(filter) => handleSelectFilter(filter)} 
                        currentFilterView={selectedFilter}
                    />
                </MotionWrap>
            </div>
        </LazyMotion>
    )
}