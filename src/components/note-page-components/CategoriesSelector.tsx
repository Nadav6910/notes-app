import styles from "../../app/my-notes/note/[noteId]/styles/notePage.module.css"
import { CategoriesSelectorProps } from "../../../types";
import { useState } from "react";
import MotionWrap from "@/wrappers/MotionWrap";
import useMediaQuery from "@/app/hooks/useMediaQuery";

export default function CategoriesSelector({availableCategories, filterByCategory}: CategoriesSelectorProps) {

    const [selectedCategory, setSelectedCategory] = useState("All")

    const handleSelectCategory = (category: string) => {
        setSelectedCategory(category)
        filterByCategory(category)
    }

    const breakPoint = useMediaQuery(850)
    
    return (
        <div className={styles.categoriesSelectorContainer}>
            <MotionWrap
                whileHover={{ y: breakPoint ? 0 : 2 }}
                transition={{duration: 0.2, type: "spring", stiffness: 120, damping: 20}}
            >
                <div 
                    className={`${styles.categoryBox} ${selectedCategory === "All" && styles.categoryBoxSelected}`}
                    onClick={() => handleSelectCategory("All")}
                >
                    All
                </div>
            </MotionWrap>
            {availableCategories.map((category) => (
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
            ))}
        </div>
    )
}
