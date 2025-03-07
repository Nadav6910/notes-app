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
import { RenameNoteFormValues, RenameNoteItemPopupProps } from '../../../types';
import MotionWrap from '@/wrappers/MotionWrap';
import { IoMdArrowDropdown } from 'react-icons/io'
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

export default function RenameNoteItemPopup(
    {
      isOpen, 
      setIsOpen,
      clientId,
      noteId,
      entryId, 
      currentName, 
      currentPriority,
      currentCategory, 
      onRename, 
      onPriorityChange, 
      onCategoryChange,
      onError,
      onSetPriorityError,
      onSetCategoryError
    }: RenameNoteItemPopupProps
) {
  
  const [loading, setLoading] = useState<boolean>(false)
  const [loadingSetPriority, setLoadingSetPriority] = useState<boolean>(false)
  const [loadingSetCategory, setLoadingSetCategory] = useState<boolean>(false)
  const [openRenameNoteItemOptionsTab, setOpenRenameNoteItemOptionsTab] = useState<boolean>(false)
  const [selectedPriorityColor, setSelectedPriorityColor] = useState<string | undefined | null>(currentPriority ? currentPriority : "none")
  const [selectedCategory, setSelectedCategory] = useState<string| undefined | null>(currentCategory ? currentCategory : "none")
  
  const controls = useAnimationControls()

  useEffect(() => {

    if (openRenameNoteItemOptionsTab) {
      controls.start({transform: "rotateX(180deg)"})
    }

    else {
      controls.start({transform: "rotateX(0deg)"})
    }

  }, [openRenameNoteItemOptionsTab, controls])

  const {
    register,
    handleSubmit,
    formState: { errors },
} = useForm<RenameNoteFormValues>({
  defaultValues: {
    newName: currentName
  }
})

  const handleClose = () => {
    setIsOpen(false)
  }

  const handleRename = async (renameFormData: RenameNoteFormValues) => {

    setLoading(true)

    const { newName } = renameFormData

    try {

      const response = await fetch(`/api/rename-note-item`, {
        method: "POST",
        body: JSON.stringify({clientId, noteId, entryId, newName}),
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
    
    catch (error) {
      setLoading(false)
      onError(true)
    }

  }

  const handleChangePriority = async () => {
      
      setLoadingSetPriority(true)
  
      try {

        const response = await fetch(`/api/change-note-item-priority`, {
          method: "POST",
          body: JSON.stringify({entryId, selectedPriorityColor}),
          cache: "no-cache",
        })
        const data = await response.json()
    
        if (data.massage === "changed note item priority") {
            setLoadingSetPriority(false)
            onPriorityChange(true, data.newPriority)
            setIsOpen(false)
        }
    
        else {
            setLoadingSetPriority(false)
            onSetPriorityError(true)
        }
      } 
      
      catch (error) {
        setLoadingSetPriority(false)
        onSetPriorityError(true)
      }
  }

  const handleChangeCategory = async () => {

    setLoadingSetCategory(true)

    try {

      const response = await fetch(`/api/change-note-item-category`, {
        method: "POST",
        body: JSON.stringify({entryId, selectedCategory}),
        cache: "no-cache",
      })
      const data = await response.json()
  
      if (data.massage === "changed note item category") {
          setLoadingSetCategory(false)
          onCategoryChange(true, data.newCategory)
          setIsOpen(false)
      }
  
      else {
        setLoadingSetCategory(false)
        onSetCategoryError(true)
      }
    } 
    
    catch (error) {
      setLoadingSetCategory(false)
      onSetCategoryError(true)
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
        <DialogContent sx={{padding: "0.8em 1em"}}>
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
                                maxLength: {value: 80, message: "Name must be shorter than 80 characters"} 
                            })} 
                            type='text'
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
                <Button 
                      sx={{marginRight: "auto"}} 
                      className={styles.renamePopupBtn} 
                      onClick={() => setOpenRenameNoteItemOptionsTab(!openRenameNoteItemOptionsTab)}
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
                        {loading ? <CircularProgress color='inherit' size={22} /> : "Save"}
                    </Button>
                    <Button className={styles.renamePopupBtn} onClick={handleClose}>Cancel</Button>
                </DialogActions>
            </form>
        </DialogContent>
        <AnimatePresence>
          {openRenameNoteItemOptionsTab &&
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
                  Change item priority color
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

                <Button 
                  className={styles.renamePopupBtn} 
                  onClick={currentPriority === selectedPriorityColor ?
                    handleClose : 
                    !currentPriority && selectedPriorityColor === "none" ? 
                    handleClose :
                    handleChangePriority
                  }
                >
                  {loadingSetPriority ? <CircularProgress color='inherit' size={22} /> : "Set Priority"}
                </Button>

                <div className={styles.addNoteItemOptionsEditCategoryContainer}>
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
                  <Button 
                    className={styles.renamePopupBtn} 
                    onClick={currentCategory === selectedCategory ?
                      handleClose : 
                      !currentCategory && selectedCategory === "none" ? 
                      handleClose :
                      handleChangeCategory
                    }
                  >
                    {loadingSetCategory ? <CircularProgress color='inherit' size={22} /> : "Set Category"}
                </Button>
                </div>
              </div>
            </MotionWrap>
          }
        </AnimatePresence>
      </Dialog>
    </div>
  )
}