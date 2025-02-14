import { useState, useRef, useEffect } from "react"
import styles from "../../app/my-notes/note/[noteId]/styles/notePage.module.css"
import { CategoriesSelectorProps } from "../../../types"
import MotionWrap from "@/wrappers/MotionWrap"
import useMediaQuery from "@/app/hooks/useMediaQuery"

export default function CategoriesSelector({ availableCategories, filterByCategory }: CategoriesSelectorProps) {
    const [selectedCategory, setSelectedCategory] = useState("empty")
    const [stickySide, setStickySide] = useState<"left" | "right">("left")
    const containerRef = useRef<HTMLDivElement | null>(null)
    const prevScrollLeft = useRef(0)

    const handleSelectCategory = (category: string) => {
        if (selectedCategory === category) {
            setSelectedCategory("empty")
            filterByCategory("empty")
            return
        }
        setSelectedCategory(category)
        filterByCategory(category)
    }

    // This custom hook returns a boolean based on screen width
    const breakPoint = useMediaQuery(850)

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const handleScroll = () => {
            const currentScrollLeft = container.scrollLeft
            
            if (currentScrollLeft > prevScrollLeft.current) {
                setStickySide("right")
            } else if (currentScrollLeft < prevScrollLeft.current) {
                setStickySide("left")
            }
            prevScrollLeft.current = currentScrollLeft
        }

        container.addEventListener("scroll", handleScroll)
        return () => container.removeEventListener("scroll", handleScroll)
    }, [])    
    
    return (
        <div className={styles.categoriesSelectorContainer} ref={containerRef}>
            {availableCategories.map(category => (
                <MotionWrap
                key={category}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ y: breakPoint ? 0 : 2 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2, type: "spring", stiffness: 120, damping: 20 }}
                className={`${selectedCategory === category ? styles.categoryBoxSelected : ""} ${selectedCategory === category ? (stickySide === "left" ? styles.categoryBoxLeft : styles.categoryBoxRight) : ""}`}
                >
                <div
                    className={`${styles.categoryBox} ${selectedCategory === category ? styles.categoryBoxSelected : ""}`}
                    onClick={() => handleSelectCategory(category)}
                >
                    {category === "none" ? "No Category" : category}
                </div>
                </MotionWrap>
            ))}
        </div>
    )
}
