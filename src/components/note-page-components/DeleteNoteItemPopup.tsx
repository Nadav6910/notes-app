import styles from "../../app/my-notes/styles/myNotes.module.css"
import { useState, forwardRef, useTransition } from 'react'
import { 
    Button, 
    Dialog, 
    DialogActions, 
    DialogContent, 
    DialogContentText, 
    DialogTitle, 
    Slide,
    CircularProgress,
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import { useRouter } from 'next/navigation';
import { ConfirmDeleteNoteItemPopupProps } from "../../../types";

const Transition = forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />
})

export default function DeleteNoteItemPopup(
    {isOpen, setIsOpen, entryId, OnDelete, onError}: ConfirmDeleteNoteItemPopupProps
) {

  const [, startTransition] = useTransition()
  const router = useRouter()

  const [loading, setLoading] = useState<boolean>(false)

  const handleClose = () => {
    setIsOpen(false)
  }

  const handleDelete = async () => {

    setLoading(true)

    const response = await fetch(`/api/delete-note-item`, {
      method: "POST",
      body: JSON.stringify({entryId}),
      cache: "no-cache",
    })
    const data = await response.json()

    if (data.massage === "deleted item") {
        setLoading(false)
        OnDelete(true)
        setIsOpen(false)
    }

    else {
        setLoading(false)
        onError(true)
    }
    
  }
 
  return (

      <Dialog
        PaperProps={{className: styles.confirmDeletePopupContainer}}
        open={isOpen}
        TransitionComponent={Transition}
        keepMounted
        onClose={handleClose}
        aria-describedby="alert-dialog-slide-description"
      >
        <DialogTitle className={styles.ConfirmDeletePopupTitle}>{"Warning"}</DialogTitle>
        <DialogContent>
          <DialogContentText className={styles.ConfirmDeletePopupText} id="alert-dialog-slide-description">
            Are you sure you want to delete this item?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button color='error' onClick={handleDelete}>
            {loading ? <CircularProgress color='error' size={22} /> : "Delete"}
        </Button>
          <Button className={styles.ConfirmDeletePopupBtn} onClick={handleClose}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
  )
}