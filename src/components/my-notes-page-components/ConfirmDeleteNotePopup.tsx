import { useState, forwardRef } from 'react'
import { 
    Button, 
    Dialog, 
    DialogActions, 
    DialogContent, 
    DialogContentText, 
    DialogTitle, 
    Slide,
    CircularProgress
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import { useRouter } from 'next/navigation';

const Transition = forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />
})

export default function ConfirmDeleteNotePopup(
    {isOpen, setIsOpen, noteId, OnDelete, onError}: ConfirmDeleteNotePopupProps
) {

  const router = useRouter()

  const [loading, setLoading] = useState<boolean>(false)

  const handleClose = () => {
    setIsOpen(false)
  }

  const handleDelete = async () => {

    setLoading(true)

    const response = await fetch(`/api/delete-note`, {
      method: "POST",
      body: JSON.stringify({noteId}),
      cache: "no-cache",
    })
    const data = await response.json()

    if (data.massage === "deleted note") {
        setLoading(false)
        OnDelete(true)
        setIsOpen(false)
        router.refresh()
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
      >
        <DialogTitle>{"Warning"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-slide-description">
            Are you sure you want to delete this note?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button color='error' onClick={handleDelete}>
            {loading ? <CircularProgress color='error' size={22} /> : "Delete"}
        </Button>
          <Button sx={{color: "black"}} onClick={handleClose}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}