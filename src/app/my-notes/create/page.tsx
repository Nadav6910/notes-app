'use client'

import styles from "../create/styles/createNote.module.css"
import { useState } from "react"
import { useSession } from "next-auth/react"
import { useForm } from 'react-hook-form'
import { useTheme } from 'next-themes'
import NoteTypeSelector from "@/components/create-notes-page-components/NoteTypeSelector"
import { GoNote } from "react-icons/go"
import { CircularProgress } from "@mui/material"
import { useRouter, redirect } from "next/navigation"

export default function CreateNote() {

  const session = useSession()
  const router = useRouter()
  const { resolvedTheme } = useTheme()

  const [noteType, setNoteType] = useState<string>("Items list")
 
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
      body: JSON.stringify({userId, noteName, noteType})
    })

    const response = await res.json()
    
    if (response.massage === "created note") {
      router.push('my-notes')
    }
  }

  if (!session) {
    redirect('/')
  }
  
  return (
    <main className={styles.createPostPageContainer}>
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
    </main>
  )
}
