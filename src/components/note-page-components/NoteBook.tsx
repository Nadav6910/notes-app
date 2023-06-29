'use client'

import styles from "../../app/my-notes/note/[noteId]/styles/notePage.module.css"
import { useState } from "react"
import { CircularProgress, Snackbar, Alert } from "@mui/material"
import { formatDate } from "@/lib/utils"
import { AiFillSave } from "react-icons/ai"
import { Entry } from "../../../types"
import { kanit } from "@/fonts/fonts"

export default function NoteBook({noteEntries, noteId}: {noteEntries: Entry[] | undefined, noteId: string}) {


    const [NotebookText, setNotebookText] = useState(noteEntries?.[0]?.item)
    const [loading, setLoading] = useState<boolean>(false)
    const [openSuccess, setOpenSuccess] = useState<boolean>(false)
    const [openSaveNoteError, setOpenSaveNoteError] = useState<boolean>(false)
    const [noChangeMadeError, setNoChangeMadeError] = useState<boolean>(false)
    
    const handleAddItem = async () => {

        setLoading(true)

        if (noteEntries?.[0]?.item === NotebookText) {
            setLoading(false)
            setNoChangeMadeError(true)
            return
        }
        
        try {
    
          const response = await fetch('/api/save-notebook', {
            method: "POST",
            body: JSON.stringify({noteId, itemName: NotebookText, entryId: noteEntries?.[0]?.entryId}),
            cache: "no-cache",
          })
    
          const data = await response.json()
          
          if (data.massage === "success") {
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
                onClick={handleAddItem} 
                className={styles.addItemToNote}
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
