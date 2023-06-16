'use client'

import styles from "../../app/my-notes/create/styles/createNote.module.css"
import { useState, useTransition } from "react"
import { useSession } from "next-auth/react"
import { useForm } from 'react-hook-form'
import { useTheme } from 'next-themes'
import NoteTypeSelector from "@/components/create-notes-page-components/NoteTypeSelector"
import { GoNote } from "react-icons/go"
import { BiArrowBack } from "react-icons/bi"
import { CircularProgress, Snackbar, Alert } from "@mui/material"
import { useRouter, redirect } from "next/navigation"
import { CreateNoteFormValues } from "../../../types"

export default function CreateNote() {

  const [, startTransition] = useTransition()

  const session = useSession()
  const router = useRouter()
  const { resolvedTheme } = useTheme()

  const [noteType, setNoteType] = useState<string>("Items list")
  const [openSuccess, setOpenSuccess] = useState(false)
  const [openError, setOpenError] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateNoteFormValues>()

  const saveNote = async (data: CreateNoteFormValues) => {

    const userId = session.data?.user.id
    const noteName = data.name
    
    const res = await fetch('/api/create-note', {
      method: "POST",
      body: JSON.stringify({ userId, noteName, noteType }),
    })

    const response = await res.json()
    
    if (response.massage === "created note") {

      setOpenSuccess(true)
      setTimeout(() => {
        setOpenSuccess(false)
        startTransition(() => {
          router.refresh()
          router.push('/my-notes')
        })
        
      }, 800)
    }

    else {
      setOpenError(true)
      setTimeout(() => {
        setOpenError(false)
      }, 2000)
    }
  }

  if (!session) {
    redirect('/')
  }
  
  return (
    <main className={styles.createPostPageContainer}>
        <div className={styles.goBackContainer} onClick={() => router.push('/my-notes')}>
          <BiArrowBack />
          <p>Back to notes</p>
        </div>
        <h2 style={{marginBottom: "1em"}}>Create a note</h2>
        <h4 style={{marginBottom: "0.5em"}}>Note type:</h4>
        <NoteTypeSelector createdNoteType={(type: string) => setNoteType(type)} />
        <form style={{marginTop: "2em"}} onSubmit={handleSubmit((data) => saveNote(data))}>
          <h4 style={{marginBottom: "0.5em", textAlign: "center"}}>Note name:</h4>
            <div style={{marginBottom: errors.name ? "0.5em" : "2em"}} className={styles.inputContainer}>
              <input 
                className={styles.nameInput}
                {...register('name', 
                { 
                    required: {value: true, message: "Name must be provided"}, 
                    minLength: {value: 2, message: "Name must be at least 2 characters"},
                    maxLength: {value: 25, message: "Name must be shorter then 25 characters"}
                })} 
                type='text'
                placeholder='Name'
                
                style={{borderColor: errors.name && "red"}} 
              />
              <div className={styles.inputIcon}><GoNote /></div>
            </div>
            {
              errors.name &&
              <p style={{color: "red", fontSize: "0.8rem", marginBottom: "2em"}}>
                  {errors.name?.message}
              </p>
            }

            <button className={styles.createNoteSubmitBtn} type='submit'>
                    {
                        isSubmitting ?
                        
                        <CircularProgress 
                            sx={
                                {
                                    width: "1.2em !important", 
                                    height: "1.2em !important", 
                                    color: resolvedTheme === 'dark' ? "#19a29b" : "#610c62"
                                }
                            } 
                        /> : "Create"
                    }
                </button>
        </form>
      
      <Snackbar
        open={openSuccess}
        autoHideDuration={2500}
        onClose={() => setOpenSuccess(false)}
        anchorOrigin={{horizontal: "center", vertical: "bottom"}}
      >
        <Alert onClose={() => setOpenSuccess(false)} severity="success" sx={{ width: '100%' }}>
            Note created successfully!
        </Alert>
      </Snackbar>

      <Snackbar
        open={openError}
        autoHideDuration={2500}
        onClose={() => setOpenError(false)}
        anchorOrigin={{horizontal: "center", vertical: "bottom"}}
      >
        <Alert onClose={() => setOpenError(false)} severity="error" sx={{ width: '100%' }}>
            There was an issue creating note, please try again later!
        </Alert>
      </Snackbar>
    </main>
  )
}
