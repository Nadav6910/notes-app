import styles from "../../app/my-notes/note/[noteId]/styles/notePage.module.css"
import { CategoriesSelectorProps } from "../../../types";
import { useState } from "react";
import MotionWrap from "@/wrappers/MotionWrap";
import useMediaQuery from "@/app/hooks/useMediaQuery";

export default function CategoriesSelector({availableCategories, filterByCategory}: CategoriesSelectorProps) {

    const [selectedCategory, setSelectedCategory] = useState("empty")

    const handleSelectCategory = (category: string) => {
        if (selectedCategory === category) {
            setSelectedCategory("empty")
            filterByCategory("empty")
            return
        }
        setSelectedCategory(category)
        filterByCategory(category)
    }
    
    // This is a custom hook that returns a boolean value based on the width of the screen
    const breakPoint = useMediaQuery(850)
    
    return (
        <div className={styles.categoriesSelectorContainer}>
            {availableCategories.map((category) => {
                return (
                    <MotionWrap
                        key={category}         
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        whileHover={{ y: breakPoint ? 0 : 2 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{duration: 0.2, type: "spring", stiffness: 120, damping: 20}}
                    >
                        <div  
                            className={`${styles.categoryBox} ${selectedCategory === category && styles.categoryBoxSelected}`}
                            onClick={() => handleSelectCategory(category)}
                        >
                            {category === "none" ? "No Category" : category}
                        </div>
                    </MotionWrap>
                )
            })}
        </div>
    )
}
