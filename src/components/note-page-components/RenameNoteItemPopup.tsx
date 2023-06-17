import styles from '../../app/my-notes/styles/myNotes.module.css'
import { useState, forwardRef } from 'react'
import { 
    Button, 
    Dialog, 
    DialogActions, 
    DialogContent, 
    DialogTitle, 
    Slide,
    CircularProgress
} from '@mui/material';
import { useForm } from 'react-hook-form'
import { TransitionProps } from '@mui/material/transitions';
import { MdOutlineDriveFileRenameOutline } from 'react-icons/md';
import { RenameNoteFormValues, RenameNoteItemPopupProps } from '../../../types';

const Transition = forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />
})

export default function RenameNoteItemPopup(
    {isOpen, setIsOpen, entryId, currentName, onRename, onError}: RenameNoteItemPopupProps
) {

  const [loading, setLoading] = useState<boolean>(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
} = useForm<RenameNoteFormValues>()

  const handleClose = () => {
    setIsOpen(false)
  }

  const handleRename = async (renameFormData: RenameNoteFormValues) => {

    setLoading(true)

    const { newName } = renameFormData

    const response = await fetch(`/api/rename-note-item`, {
      method: "POST",
      body: JSON.stringify({entryId, newName}),
      cache: "no-cache",
    })
    const data = await response.json()

    if (data.massage === "renamed note item") {
        setLoading(false)
        onRename(true, data.newName)
        setIsOpen(false)
    }

    else {
        setLoading(false)
        onError(true)
    }
  }
 
  return (

    <div>
      <Dialog
        open={isOpen}
        TransitionComponent={Transition}
        keepMounted
        onClose={handleClose}
        aria-describedby="alert-dialog-slide-description"
        PaperProps={{className: styles.renamePopupContainer}}
      >
        <DialogTitle className={styles.renamePopupTitle}>{"Rename Item"}</DialogTitle>
        <DialogContent>
            <form 
                onSubmit={handleSubmit((data) => handleRename(data))} 
                className={styles.formContainer}
            >
                <div className={styles.inputContainer}>
                        <input 
                            className={styles.renameInput}
                            autoFocus
                            {...register('newName', 
                            { 
                                required: {value: true, message: "New name must be provided!"},
                                minLength: {value: 2, message: "Name must be at least 2 characters"},
                                maxLength: {value: 20, message: "Name must be shorter then 20 characters"} 
                            })} 
                            type='text'
                            placeholder={currentName}
                            
                            style={{borderColor: errors.newName ? "red" : "initial"}} 
                        />
                        <div className={styles.inputIcon}><MdOutlineDriveFileRenameOutline /></div>
                    </div>
                    {
                        errors.newName ?
                        <span style={{color: "red", fontSize: "0.8rem"}}>
                            {errors.newName?.message}
                        </span> : null
                    }
                <DialogActions sx={{padding: 0}}>
                    <Button className={styles.renamePopupBtn} type='submit'>
                        {loading ? <CircularProgress color='inherit' size={22} /> : "Save"}
                    </Button>
                    <Button className={styles.renamePopupBtn} onClick={handleClose}>Cancel</Button>
                </DialogActions>
            </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}