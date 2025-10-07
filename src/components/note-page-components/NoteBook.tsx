'use client'

import styles from "../../app/my-notes/note/[noteId]/styles/notePage.module.css"
import { useState, useEffect, useRef } from "react"
import { CircularProgress, Snackbar, Alert } from "@mui/material"
import { formatDate } from "@/lib/utils"
import { AiFillSave } from "react-icons/ai"
import { Entry } from "../../../types"
import { kanit } from "@/fonts/fonts"
import { useScroll, AnimatePresence } from 'framer-motion'
import MotionWrap from "@/wrappers/MotionWrap"

export default function NoteBook({noteEntries, noteId}: {noteEntries: Entry[] | undefined, noteId: string}) {
    
    const { scrollY } = useScroll()

    const [NotebookText, setNotebookText] = useState(noteEntries?.[0]?.item)
    const [loading, setLoading] = useState<boolean>(false)
    const [isButtonVisible, setIsButtonVisible] = useState<boolean>(true)
    const [openSuccess, setOpenSuccess] = useState<boolean>(false)
    const [openSaveNoteError, setOpenSaveNoteError] = useState<boolean>(false)
    const [noChangeMadeError, setNoChangeMadeError] = useState<boolean>(false)

    const saveNoteButtonRef = useRef<HTMLDivElement>(null)

    // Check if the save note button is in view
    useEffect(() => {

        const handleScroll = () => {

            const saveNoteButton = saveNoteButtonRef.current

            if (saveNoteButton) {

                const { top, bottom } = saveNoteButton.getBoundingClientRect()
                const isElementVisible = top < window.innerHeight && bottom >= 0
                
                if (!isElementVisible && isButtonVisible) {
                // Element is scrolled out of view
                setIsButtonVisible(false)
                }

                else if (isElementVisible && !isButtonVisible) {
                // Element is in view
                setIsButtonVisible(true)
                }
            }
        }

        scrollY.on("change", handleScroll)

        return () => {
            scrollY.clearListeners()
        }

    }, [scrollY, isButtonVisible])
    
    const handleSaveNotebook = async () => {

        setLoading(true)

        if (noteEntries?.[0]?.item === NotebookText) {
            setLoading(false)
            setNoChangeMadeError(true)
            return
        }

        if (noteEntries && noteEntries?.length > 0) {
            noteEntries[0].item = NotebookText!
        }
        
        try {
    
          const response = await fetch('/api/save-notebook', {
            method: "POST",
            body: JSON.stringify({noteId, itemName: NotebookText, entryId: noteEntries?.[0]?.entryId}),
            cache: "no-cache",
          })
    
          const data = await response.json()
          
          if (data.message === "success") {
            setLoading(false)
            setOpenSuccess(true)
          }
      
          else {
            setLoading(false)
            setOpenSaveNoteError(true)
          }
        }
        
        catch (error) {
          setLoading(false)
          setOpenSaveNoteError(true)
        }
    
    }

    return (
        <>

            {noteEntries?.[0]?.lastEdit ? 
                <h5 style={{marginBottom: "2em", alignSelf: "flex-start", fontSize: "0.75rem"}}>
                    {`Last Updated: ${formatDate(noteEntries?.[0]?.lastEdit)}`}
                </h5> : null
            }

            <div 
                onClick={handleSaveNotebook} 
                className={styles.addItemToNote}
                ref={saveNoteButtonRef}
            >
                {
                    loading ? 

                    <CircularProgress 
                        sx={{width: "1em !important", height: "1em !important"}} 
                        className={styles.backDropLoader} 
                    /> : 

                    <AiFillSave  />
                }
              <p>Save Notebook</p>
            </div>

            <AnimatePresence>
                {!isButtonVisible && 
                    <MotionWrap
                    className={styles.addItemToNotePopupSticky}
                    onClick={handleSaveNotebook}
                    initial={{scale: 0.5, y: 100}}
                    animate={{scale: 1, y: 0}}
                    exit={{scale: 0.5, y: 100}}
                    transition={{duration: 0.5, type: "spring", bounce: 0.25}}
                    >
                        {
                            loading ? 

                            <CircularProgress 
                                sx={{width: "1em !important", height: "1em !important", color: "white !important"}} 
                                className={styles.floatingSaveBtn}
                            /> : 

                            <AiFillSave style={{height: "1.2em", width: "1.2em"}} />
                        }
                    </MotionWrap>
                }
            </AnimatePresence>

            <textarea 
                className={`${kanit.className} ${styles.noteBookTextArea}`} 
                name="note-book" 
                rows={40} 
                placeholder="Write something..." 
                value={NotebookText}
                onChange={(e) => setNotebookText(e.target.value)}
            />

            {openSuccess && 
                <Snackbar
                    open={openSuccess}
                    autoHideDuration={2500}
                    onClose={() => setOpenSuccess(false)}
                    anchorOrigin={{horizontal: "center", vertical: "bottom"}}
                >
                    <Alert onClose={() => setOpenSuccess(false)} severity="success" sx={{ width: '100%' }}>
                        Notebook saved successfully!
                    </Alert>
                </Snackbar>
            }

            {openSaveNoteError && 
                <Snackbar
                open={openSaveNoteError}
                autoHideDuration={2500}
                onClose={() => setOpenSaveNoteError(false)}
                anchorOrigin={{horizontal: "center", vertical: "bottom"}}
                >
                    <Alert 
                        onClose={() => setOpenSaveNoteError(false)} 
                        severity="error" 
                        sx={{ width: '100%' }}
                    >
                        Error saving notebook!
                    </Alert>
                </Snackbar>
            }

            {noChangeMadeError && 
                <Snackbar
                open={noChangeMadeError}
                autoHideDuration={2500}
                onClose={() => setNoChangeMadeError(false)}
                anchorOrigin={{horizontal: "center", vertical: "bottom"}}
                >
                    <Alert 
                        onClose={() => setNoChangeMadeError(false)} 
                        severity="error" 
                        sx={{ width: '100%' }}
                    >
                        No changes were made to the notebook, make some changes and try again!
                    </Alert>
                </Snackbar>
            }
        </>
    )
}
