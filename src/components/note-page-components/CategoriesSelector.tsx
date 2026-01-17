import { useState, useRef, useEffect } from "react"
import styles from "../../app/my-notes/note/[noteId]/styles/notePage.module.css"
import { CategoriesSelectorProps } from "../../../types"
import { m, LazyMotion, domAnimation } from "framer-motion"
import useMediaQuery from "@/app/hooks/useMediaQuery"
import { useTheme } from 'next-themes'

// Get emoji icon for category
const getCategoryIcon = (category: string): string => {
    const lowerCategory = category.toLowerCase()
    if (lowerCategory === "none" || lowerCategory === "no category") return "📋"
    if (lowerCategory.includes("fruit") || lowerCategory.includes("פירות")) return "🍎"
    if (lowerCategory.includes("vegetable") || lowerCategory.includes("ירקות")) return "🥕"
    if (lowerCategory.includes("dairy") || lowerCategory.includes("חלב")) return "🥛"
    if (lowerCategory.includes("meat") || lowerCategory.includes("בשר")) return "🥩"
    if (lowerCategory.includes("bread") || lowerCategory.includes("לחם")) return "🍞"
    if (lowerCategory.includes("drink") || lowerCategory.includes("שתייה")) return "🥤"
    if (lowerCategory.includes("snack") || lowerCategory.includes("חטיף")) return "🍿"
    if (lowerCategory.includes("frozen") || lowerCategory.includes("קפוא")) return "❄️"
    if (lowerCategory.includes("clean") || lowerCategory.includes("ניקיון")) return "🧹"
    if (lowerCategory.includes("beverages") || lowerCategory.includes("משקאות")) return "🍺"
    if (lowerCategory.includes("household essentials") || lowerCategory.includes("מוצרים נחוצים")) return "🏠"
    if (lowerCategory.includes("condiments") || lowerCategory.includes("רטבים")) return "🍯"
    if (lowerCategory.includes("grains") || lowerCategory.includes("דגנים")) return "🌾"
    if (lowerCategory.includes("canned goods") || lowerCategory.includes("שימורים")) return "🥫"
    if (lowerCategory.includes("bakery") || lowerCategory.includes("מאפייה")) return "🥖"
    if (lowerCategory.includes("spices") || lowerCategory.includes("תבלינים")) return "🧂"
    if (lowerCategory.includes("health foods") || lowerCategory.includes("מזונות בריאות")) return "💪"
    if (lowerCategory.includes("baby food") || lowerCategory.includes("מזון לתינוקות")) return "🍼"
    if (lowerCategory.includes("pet supplies") || lowerCategory.includes("ציוד לחיות מחמד")) return "🐶"
    if (lowerCategory.includes("personal") || lowerCategory.includes("אישי")) return "🧘"
    if (lowerCategory.includes("work") || lowerCategory.includes("עבודה")) return "💼"
    return "📦"
}

interface ExtendedCategoriesSelectorProps extends CategoriesSelectorProps {
    itemCounts?: Record<string, number>
}

export default function CategoriesSelector({ availableCategories, filterByCategory, itemCounts }: ExtendedCategoriesSelectorProps) {

    const { resolvedTheme } = useTheme()

    const [selectedCategory, setSelectedCategory] = useState("empty")
    const [stickySide, setStickySide] = useState<"left" | "right">("left")
    const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)
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
        <LazyMotion features={domAnimation}>
            <div className={styles.categoriesSelectorContainer} ref={containerRef}>
                {availableCategories.map((category, index) => {
                    const isSelected = selectedCategory === category
                    const isHovered = hoveredCategory === category
                    const count = itemCounts?.[category]
                    
                    return (
                        <m.div
                            key={category}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ 
                                opacity: 1, 
                                x: 0
                            }}
                            transition={{ duration: 0.15 }}
                            className={`${isSelected ? styles.categoryBoxSelected : ""} ${isSelected ? (stickySide === "left" ? styles.categoryBoxLeft : styles.categoryBoxRight) : ""}`}
                            onHoverStart={() => setHoveredCategory(category)}
                            onHoverEnd={() => setHoveredCategory(null)}
                        >
                            <m.div
                                className={`${styles.categoryBox} ${isSelected ? styles.categoryBoxSelected : ""}`}
                                onClick={() => handleSelectCategory(category)}
                                style={{ position: 'relative' }}
                                animate={isHovered && !isSelected ? {
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
                            >
                                {/* Icon with wobble animation when selected */}
                                <m.span
                                    animate={isSelected ? {
                                        rotate: [0, -15, 15, -10, 10, -5, 5, 0],
                                        scale: [1, 1.2, 1.2, 1.1, 1.1, 1.05, 1.05, 1]
                                    } : { rotate: 0, scale: 1 }}
                                    transition={{ 
                                        duration: 0.6,
                                        ease: "easeInOut"
                                    }}
                                    style={{ 
                                        display: 'inline-flex',
                                        marginRight: '0.35em',
                                        fontSize: '1rem'
                                    }}
                                >
                                    {getCategoryIcon(category)}
                                </m.span>
                                
                                {/* Category name */}
                                <span>{category === "none" ? "No Category" : category}</span>
                                
                                {/* Item count chip */}
                                {count !== undefined && (
                                    <m.span
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ 
                                            type: "spring", 
                                            stiffness: 500, 
                                            damping: 25,
                                            delay: index * 0.03
                                        }}
                                        style={{
                                            marginLeft: '0.4em',
                                            backgroundColor: isSelected ? 'var(--secondary-color)' : 'var(--primary-color)',
                                            color: isSelected ? (resolvedTheme === "light" ? 'var(--primary-color-text-contrast)' : 'var(--primary-color)') : 'var(--primary-color-text-contrast)',
                                            fontSize: '0.7rem',
                                            fontWeight: 600,
                                            padding: '0.1em 0.45em',
                                            borderRadius: '10px',
                                            minWidth: '1.2em',
                                            textAlign: 'center',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.25s ease'
                                        }}
                                    >
                                        {count}
                                    </m.span>
                                )}
                                
                                {/* Bottom line indicator */}
                                <m.div
                                    initial={false}
                                    animate={{ scaleX: isSelected ? 1 : 0 }}
                                    transition={{
                                        duration: isSelected ? 0.25 : 0.15,
                                        ease: "linear"
                                    }}
                                    style={{
                                        position: 'absolute',
                                        bottom: 3,
                                        left: '15%',
                                        right: '15%',
                                        height: 2,
                                        backgroundColor: 'var(--secondary-color)',
                                        borderRadius: 2,
                                        transformOrigin: 'center',
                                        willChange: 'transform'
                                    }}
                                />
                            </m.div>
                        </m.div>
                    )
                })}
            </div>
        </LazyMotion>
    )
}
