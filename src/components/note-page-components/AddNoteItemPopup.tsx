import styles from '../../app/my-notes/styles/myNotes.module.css'
import { useState, useEffect, forwardRef } from 'react'
import { 
    Button,
    Dialog, 
    DialogActions, 
    DialogContent, 
    DialogTitle, 
    Slide,
    CircularProgress,
    FormControlLabel,
    Radio,
    RadioGroup,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Divider
} from '@mui/material';
import { useForm } from 'react-hook-form'
import { TransitionProps } from '@mui/material/transitions';
import { MdOutlineDriveFileRenameOutline } from 'react-icons/md';
import { IoMdArrowDropdown } from 'react-icons/io'
import { AddNoteItemFormValues, AddNoteItemPopupProps } from '../../../types';
import MotionWrap from '@/wrappers/MotionWrap';
import { AnimatePresence, useAnimationControls } from 'framer-motion';
import { generalCategories, foodCategories } from '@/text/noteCategories';

const Transition = forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />
})

export default function AddNoteItemPopup(
    {isOpen, setIsOpen, clientId, noteId, onAdd, onError}: AddNoteItemPopupProps
) {

  const [loading, setLoading] = useState<boolean>(false)
  const [openAddNoteItemOptionsTab, setOpenAddNoteItemOptionsTab] = useState<boolean>(false)
  const [selectedPriorityColor, setSelectedPriorityColor] = useState<string>("none")
  const [selectedCategory, setSelectedCategory] = useState<string>("none")

  const controls = useAnimationControls()
  
  useEffect(() => {

    if (openAddNoteItemOptionsTab) {
      controls.start({transform: "rotateX(180deg)"})
    }

    else {
      controls.start({transform: "rotateX(0deg)"})
    }

  }, [openAddNoteItemOptionsTab, controls])

  const {
    register,
    handleSubmit,
    formState: { errors },
} = useForm<AddNoteItemFormValues>()

  const handleClose = () => {
    setSelectedPriorityColor("none")
    setIsOpen(false)
  }

  const handleAddItem = async (addItemFormData: AddNoteItemFormValues) => {

    setLoading(true)

    const { itemName } = addItemFormData

    try {

      const response = await fetch('/api/create-note-item', {
        method: "POST",
        body: JSON.stringify({clientId, noteId, itemName, selectedPriorityColor, selectedCategory}),
        cache: "no-cache",
      })

      const data = await response.json()
      
      if (data.massage === "success") {
          setLoading(false)
          setIsOpen(false)
          onAdd({...data.createdEntry, createdAt: new Date(data.createdEntry.createdAt)})
      }
  
      else {
        setLoading(false)
        onError(true)
      }
    }
    
    catch (error) {
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
        <DialogContent sx={{padding: "0.8em 1em"}}>
            <form 
                onSubmit={handleSubmit((data) => handleAddItem(data))} 
                className={styles.formContainer}
            >
              <div className={styles.inputContainer}>
                <input 
                  className={styles.renameInput}
                  autoFocus
                  {...register('itemName', 
                  { 
                      required: {value: true, message: "Item name must be provided!"},
                      minLength: {value: 2, message: "Item name must be at least 2 characters"},
                      maxLength: {value: 200, message: "Item name must be shorter then 200 characters"} 
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
              <DialogActions sx={{padding: 0, display: "flex"}}>
                <Button 
                  sx={{marginRight: "auto"}} 
                  className={styles.renamePopupBtn} 
                  onClick={() => setOpenAddNoteItemOptionsTab(!openAddNoteItemOptionsTab)}
                  startIcon={
                    <MotionWrap
                      style={{display: "flex"}}
                      animate={controls}
                      transition={
                        {duration: 2, type: "spring", stiffness: 200, damping: 20}
                      }
                    >
                      <IoMdArrowDropdown />
                    </MotionWrap>
                  }
                >
                  Options
                </Button>
                <Button className={styles.renamePopupBtn} type='submit'>
                    {loading ? <CircularProgress color='inherit' size={22} /> : "Add"}
                </Button>
                <Button className={styles.renamePopupBtn} onClick={handleClose}>Cancel</Button>
              </DialogActions>
            </form>
        </DialogContent>
        <AnimatePresence>
          {openAddNoteItemOptionsTab &&
            <MotionWrap
              initial={{height: 0}}
              animate={{height: "auto"}}
              exit={{height: 0}} 
              transition={
                {duration: 2, type: "spring", stiffness: 100, damping: 20}
              }
            >
              <div className={styles.addNoteItemOptionsSectionContainer}>
                <p className={styles.addNoteItemOptionsSelectPriorityTitle}>
                  Select item priority color
                </p>
                <RadioGroup 
                  value={selectedPriorityColor}
                  className={styles.addNoteItemOptionsSelectPriorityContainer}
                  onChange={(e) => setSelectedPriorityColor(e.target.value)}
                >
                  <FormControlLabel
                    className={styles.noneCheckboxLabel}
                    value="none"
                    control={<Radio className={styles.noneCheckBox} />}
                    label="None"
                    labelPlacement="end"
                  />
                  <FormControlLabel
                    className={styles.greenCheckboxLabel}
                    value="green"
                    control={<Radio className={styles.greenCheckBox} />}
                    label="Not urgent"
                    labelPlacement="end"
                  />
                  <FormControlLabel
                    className={styles.yellowCheckboxLabel}
                    value="yellow"
                    control={<Radio className={styles.yellowCheckBox} />}
                    label="Mildly urgent"
                    labelPlacement="end"
                  />
                  <FormControlLabel
                    className={styles.redCheckboxLabel}
                    value="red"
                    control={<Radio className={styles.redCheckBox} />}
                    label="Urgent"
                    labelPlacement="end"
                  />
                </RadioGroup>
              </div>
              <div className={styles.addNoteItemOptionsAddCategoryContainer}>
                <p className={styles.addNoteItemOptionsAddCategoryTitle}>
                  Add category
                </p>
                <FormControl fullWidth>
                  <InputLabel className={styles.selectLabel} id="select-item-category">Category</InputLabel>
                  <Select
                    labelId="select-item-category-label"
                    id="select-item-category"
                    MenuProps={{classes: {paper: styles.selectMenuPaper}}}
                    inputProps={{classes: {icon: styles.selectIcon,}}}
                    value={selectedCategory}
                    label="Category"
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <MenuItem 
                      className={styles.selectMenuItem}
                      value={"none"}
                    >
                      None
                    </MenuItem>
                    <Divider sx={{boxShadow: "0px 0px 15px 0px #39393933"}} />
                    <MenuItem
                      disabled 
                      className={styles.selectMenuItem} 
                      value={"general"}
                    >
                      Groceries
                    </MenuItem>
                    <Divider sx={{boxShadow: "0px 0px 15px 0px #39393933"}} />
                    {foodCategories.map((category, index) => (
                      <MenuItem
                        key={index} 
                        className={styles.selectMenuItem} 
                        value={category}
                      >
                        {category}
                      </MenuItem>
                    ))}
                    <Divider sx={{boxShadow: "0px 0px 15px 0px #39393933"}} />
                    <MenuItem 
                      disabled 
                      className={styles.selectMenuItem} 
                      value={"general"}
                    >
                      General
                    </MenuItem>
                    <Divider sx={{boxShadow: "0px 0px 15px 0px #39393933"}} />
                    {generalCategories.map((category, index) => (
                      <MenuItem 
                        key={index} 
                        className={styles.selectMenuItem} 
                        value={category}
                      >
                        {category}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>
            </MotionWrap>
          }
        </AnimatePresence>
      </Dialog>
    </div>
  )
}