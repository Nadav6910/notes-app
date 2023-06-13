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
import { AddNoteItemFormValues, AddNoteItemPopupProps } from '../../../types';

const Transition = forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />
})

export default function AddNoteItemPopup(
    {isOpen, setIsOpen, noteId, onAdd, onError}: AddNoteItemPopupProps
) {

  const [loading, setLoading] = useState<boolean>(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
} = useForm<AddNoteItemFormValues>()

  const handleClose = () => {
    setIsOpen(false)
  }

  const handleAddItem = async (addItemFormData: AddNoteItemFormValues) => {

    setLoading(true)

    const { itemName } = addItemFormData

    const response = await fetch('/api/create-note-item', {
      method: "POST",
      body: JSON.stringify({noteId, itemName}),
      cache: "no-cache",
    })
    const data = await response.json()

    if (data.massage === "success") {
        setLoading(false)
        setIsOpen(false)
        onAdd(data.createdEntry)
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
        <DialogTitle className={styles.renamePopupTitle}>{"Add note item"}</DialogTitle>
        <DialogContent>
            <form 
                onSubmit={handleSubmit((data) => handleAddItem(data))} 
                className={styles.formContainer}
            >
                <div className={styles.inputContainer}>
                        <input 
                            className={styles.renameInput}
                            {...register('itemName', 
                            { 
                                required: {value: true, message: "Item name must be provided!"},
                                minLength: {value: 2, message: "Item name must be at least 2 characters"},
                                maxLength: {value: 20, message: "Item name must be shorter then 20 characters"} 
                            })} 
                            type='text'
                            placeholder="Item name.."
                            
                            style={{borderColor: errors.itemName? "red" : "initial"}} 
                        />
                        <div className={styles.inputIcon}><MdOutlineDriveFileRenameOutline /></div>
                    </div>
                    {
                        errors.itemName ?
                        <span style={{color: "red", fontSize: "0.8rem"}}>
                            {errors.itemName?.message}
                        </span> : null
                    }
                <DialogActions sx={{padding: 0}}>
                    <Button className={styles.renamePopupBtn} type='submit'>
                        {loading ? <CircularProgress color='inherit' size={22} /> : "Add"}
                    </Button>
                    <Button className={styles.renamePopupBtn} onClick={handleClose}>Cancel</Button>
                </DialogActions>
            </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}