import styles from '../../app/my-notes/styles/myNotes.module.css'
import { useState, useEffect, useRef, forwardRef } from 'react'
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, Slide,
  CircularProgress, FormControlLabel, RadioGroup, FormControl, Radio as MuiRadio,
  InputLabel, Select, MenuItem, Divider, TextField, Autocomplete,
  ListItem, ListItemAvatar, Avatar, ListItemText, InputAdornment, Box, Chip, Table, 
  TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography,
  Checkbox, FormHelperText
} from '@mui/material'
import { useForm, Controller } from 'react-hook-form'
import { TransitionProps } from '@mui/material/transitions'
import { MdOutlineDriveFileRenameOutline } from 'react-icons/md'
import { IoMdArrowDropdown } from 'react-icons/io'
import { AddNoteItemFormValues, AddNoteItemPopupProps } from '../../../types'
import MotionWrap from '@/wrappers/MotionWrap'
import { AnimatePresence, useAnimationControls } from 'framer-motion'
import { generalCategories, foodCategories } from '@/text/noteCategories'
import { useDebouncedValue } from '../../app/hooks/useDebouncedValue'
import { useHebrewCity } from '@/app/hooks/useHebrewCity'

const Transition = forwardRef(function Transition (
  props: TransitionProps & { children: React.ReactElement<any, any> },
  ref: React.Ref<unknown>
) {
  return <Slide direction='up' ref={ref} {...props} />
})

type SelectedProduct = {
  name: string;        // original primary from autocomplete (uncropped)
  barcode: string | null;
  href: string | null;
}

type AutocompleteSuggestion = {
  primary: string
  extra: string | null
  img: string | null
  href: string | null
  barcode: string | null
  priceRange: string | null
}

  type StorePriceRow = {
  chain: string
  branch: string
  address: string | null
  salePrice: string | null
  saleTitle: string | null
  saleDesc: string | null
  price: string | null
}

type GetPricesResponse =
  | { ok: true, count: number, rows: StorePriceRow[] }
  | { ok: false, error: string }

const DEBOUNCE_MS = 500

export default function AddNoteItemPopup (
  { isOpen, setIsOpen, clientId, noteId, onAdd, onError }: AddNoteItemPopupProps
) {
  const [loading, setLoading] = useState(false)
  const [openAddNoteItemOptionsTab, setOpenAddNoteItemOptionsTab] = useState(false)
  const [selectedPriorityColor, setSelectedPriorityColor] = useState('none')
  const [selectedCategory, setSelectedCategory] = useState('none')

  const [comparePrices, setComparePrices] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<SelectedProduct | null>(null)
  const [pricesLoading, setPricesLoading] = useState(false)
  const [pricesError, setPricesError] = useState<string | null>(null)
  const [pricesRows, setPricesRows] = useState<StorePriceRow[] | null>(null)

  const [acOpen, setAcOpen] = useState(false)
  const [acLoading, setAcLoading] = useState(false)
  const [options, setOptions] = useState<AutocompleteSuggestion[]>([])
  const [inputValue, setInputValue] = useState('')      // updated by typing/clear only
  const [hadError, setHadError] = useState(false)       // used to drive empty-state visibility

  const { city } = useHebrewCity({ preferGPS: true })
  
  const abortRef = useRef<AbortController | null>(null)
  const controls = useAnimationControls()

  useEffect(() => {
    controls.start({ transform: openAddNoteItemOptionsTab ? 'rotateX(180deg)' : 'rotateX(0deg)' })
  }, [openAddNoteItemOptionsTab, controls])

  const {
    handleSubmit,
    control,
    watch,
    formState: { errors }
  } = useForm<AddNoteItemFormValues>()

  const handleClose = () => {
    setSelectedPriorityColor('none')
    setIsOpen(false)
  }

  const handleAddItem = async (addItemFormData: AddNoteItemFormValues) => {
    setLoading(true)
    const { itemName } = addItemFormData
    try {
      const response = await fetch('/api/create-note-item', {
        method: 'POST',
        body: JSON.stringify({ clientId, noteId, itemName, selectedPriorityColor, selectedCategory }),
        cache: 'no-cache'
      })
      const data = await response.json()

      if (data.massage === 'success') {
        setLoading(false)
        setIsOpen(false)
        onAdd({ ...data.createdEntry, createdAt: new Date(data.createdEntry.createdAt) })
      } else {
        setLoading(false)
        onError(true)
      }
    } catch {
      setLoading(false)
      onError(true)
    }
  }

  const fetchPrices = async (prod?: SelectedProduct | null) => {

    if (!comparePrices) return

    const p = prod ?? selectedProduct
    if (!p) return

    setPricesLoading(true)
    setPricesError(null)

    try {
      const res = await fetch('/api/get-product-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: p.name,           // original (uncropped) name
          barcode: p.barcode,
          locationName: city,       // optional: pass if you want to pin the city
        })
      })

      const data: GetPricesResponse = await res.json()
      if (data.ok) {
        setPricesRows(data.rows)
      } else {
        setPricesRows([])
        setPricesError(data.error || 'Failed to load prices')
      }
    } 
    
    catch (e: any) {
      setPricesRows([])
      setPricesError(e?.message || 'Network error')
    } 
    
    finally {
      setPricesLoading(false)
    }
  }

  // value the user sees in the input
  const itemNameLive = watch('itemName', '')

  // only scrape on Hebrew input, after debounce
  const debouncedQuery = useDebouncedValue(inputValue, DEBOUNCE_MS)

  const isHebrew = (s: string) => /[\u0590-\u05FF]/.test(s)
  const cropName = (s: string) => s.split(/[,،‚，]/)[0].trim()
  const canOpen = (s: string) => /[\u0590-\u05FF]/.test(s) && s.trim().length >= 3

  useEffect(() => {
    const q = debouncedQuery.trim()

    // block all scraping when comparePrices is off
    if (!comparePrices) {
      setOptions([])
      setAcLoading(false)
      setHadError(false)
      setAcOpen(false)
      abortRef.current?.abort()
      return
    }

    // only Hebrew + length >= 3 will trigger scraping/open
    if (q.length < 3 || !isHebrew(q)) {
      setOptions([])
      setAcLoading(false)
      setHadError(false)
      setAcOpen(false)
      abortRef.current?.abort()
      return
    }

    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    const run = async () => {
      setAcLoading(true)
      setHadError(false)
      try {
        const res = await fetch('/api/auto-complete-products-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemName: q, locationName: city }),
          signal: ac.signal
        })

        const data = await res.json()
        
        const raw: AutocompleteSuggestion[] = data?.ok ? data.suggestions ?? [] : []
        const trimmed = raw.length > 1 ? raw.slice(0, -1) : raw   // drop "view more"
        setOptions(trimmed)
        setAcOpen(true)                     // open when results arrive
      } catch {
        if (!ac.signal.aborted) {
          setHadError(true)
          setOptions([])                    // empty triggers noOptionsText
          setAcOpen(true)                   // force open to show empty-state text
        }
      } finally {
        setAcLoading(false)
      }
    }

    run()
  }, [comparePrices, debouncedQuery, city])

  // reset everything when closing popup or turning off comparePrices
  useEffect(() => {
    if (!comparePrices) {
      abortRef.current?.abort()
      setAcOpen(false)
      setOptions([])
      setAcLoading(false)
      setHadError(false)
      setSelectedProduct(null)
      setPricesRows(null)
      setPricesError(null)
    }
  }, [comparePrices])

  return (
    <div>
      <Dialog
        open={isOpen}
        TransitionComponent={Transition}
        keepMounted
        onClose={handleClose}
        aria-describedby='alert-dialog-slide-description'
        maxWidth={pricesRows && pricesRows.length > 0 ? 'lg' : 'sm'}   // ← widen when table exists
        PaperProps={{ className: styles.renamePopupContainer, }}
      >
        <DialogTitle className={styles.renamePopupTitle}>Add note item</DialogTitle>

        <DialogContent sx={{ padding: '0.8em 1em' }}>
          <form onSubmit={handleSubmit((data) => handleAddItem(data))} className={styles.formContainer}>
            <Controller
              name='itemName'
              control={control}
              rules={{
                required: { value: true, message: 'Item name must be provided!' },
                minLength: { value: 2, message: 'Item name must be at least 2 characters' },
                maxLength: { value: 80, message: 'Item name must be shorter than 80 characters' }
              }}
              render={({ field }) => (
                <Autocomplete<AutocompleteSuggestion, false, false, true>
                  freeSolo
                  // bind displayed text to form value
                  inputValue={itemNameLive}
                  onClose={(_, reason) => {
                    if (reason === 'blur' || reason === 'toggleInput' || reason === 'escape') {
                      setAcOpen(false)
                    }
                  }}
                  // open only if: we explicitly opened it AND user typed 3+ AND it's Hebrew,
                  // OR we had an error (to show "No items found" for Hebrew queries)
                  open={
                    acOpen &&
                    canOpen(itemNameLive) &&
                    (options.length > 0 || hadError || acLoading)
                  }
                  options={options}
                  loading={acLoading}
                  loadingText='Loading...'
                  noOptionsText={hadError ? 'No items found' : 'No items found'}
                  filterOptions={(x) => x}
                  getOptionLabel={(o) => typeof o === 'string' ? o : o.primary}
                  disablePortal={false}
                  slotProps={{
                    popper: {
                      sx: {
                        zIndex: 2000,
                        '& .MuiAutocomplete-paper': {
                          backgroundColor: 'var(--menu-background-color)',
                          color: 'var(--primary-color)',
                          border: '1px solid var(--borders-color)'
                        },
                        '& .MuiAutocomplete-listbox': {
                          maxHeight: 360,
                          padding: 0,
                          backgroundColor: 'var(--menu-background-color)',
                          '& li': { borderBottom: '1px solid var(--borders-color)' },
                          '& li:last-of-type': { borderBottom: 'none' }
                        },
                        // ensure both loading and empty rows use your vars
                        '& .MuiAutocomplete-noOptions, & .MuiAutocomplete-loading': {
                          color: 'var(--primary-color)',
                          opacity: .9
                        },
                        '& .MuiAutocomplete-option': {
                          '&[aria-selected="true"]': { backgroundColor: 'var(--secondary-color-faded)' },
                          '&.Mui-focused': { backgroundColor: 'var(--secondary-color-faded)' }
                        }
                      }
                    },
                    clearIndicator: { sx: { color: 'var(--primary-color)', '&:hover': { color: 'var(--secondary-color)' } } },
                    popupIndicator: { sx: { color: 'var(--primary-color)' } }
                  }}
                  // typing / clearing ONLY trigger scraping
                  onInputChange={(_, val, reason) => {

                    if (!comparePrices) {
                      // typing without scraping
                      field.onChange(val)
                      setInputValue('')        // keep scraper input empty
                      setOptions([])
                      setAcLoading(false)
                      setHadError(false)
                      setAcOpen(false)
                      setSelectedProduct(null)
                      setPricesRows(null)
                      setPricesError(null)
                      return
                    }

                    if (reason === 'input') {
                      // manual typing → forget previous selection & table
                      setSelectedProduct(null)
                      setPricesRows(null)
                      setPricesError(null)

                      if (isHebrew(val)) {
                        setInputValue(val)
                        setAcLoading(true)
                        setHadError(false)
                        field.onChange(val)
                        setAcOpen(val.trim().length >= 3)
                      } 
                      
                      else {
                        setInputValue('')
                        setOptions([])
                        setAcLoading(false)
                        setHadError(false)
                        field.onChange(val)
                        setAcOpen(false)
                      }
                    } 
                    
                    else if (reason === 'clear') {
                      setSelectedProduct(null)
                      setPricesRows(null)
                      setPricesError(null)
                      setInputValue('')
                      setOptions([])
                      setAcLoading(false)
                      setHadError(false)
                      field.onChange('')
                      setAcOpen(false)
                    }
                    // ignore 'reset'
                  }}
                  // selecting -> crop visible text and close (no scrape)
                  onChange={(_, val) => {
                    if (typeof val === 'string') {
                      // free-solo strings are not a “real selection” → keep button disabled
                      const cropped = cropName(val)
                      field.onChange(cropped)
                      setSelectedProduct(null)
                      setPricesRows(null)
                      setPricesError(null)
                    } 
                    
                    else if (val) {
                      const cropped = cropName(val.primary)       // what the user sees
                      field.onChange(cropped)

                      const chosen: SelectedProduct = {
                        name: val.primary,                        // original (uncropped)
                        barcode: val.barcode ?? null,
                        href: val.href ?? null
                      }
                      setSelectedProduct(chosen)
                      setAcOpen(false)

                      // scrape right away on selection
                      // fetchPrices(chosen)
                    }
                  }}
                  // fix <li> nesting by rendering ListItem as 'div'
                  renderOption={(props, option) => (
                    <li {...props} key={option.barcode ?? option.href ?? option.primary}>
                      <ListItem disableGutters dense component='div'>
                        <ListItemAvatar>
                          <Avatar
                            src={option.img || undefined}
                            sx={{ bgcolor: 'transparent', color: 'var(--primary-color)' }}
                          >
                            {(option.primary?.[0] ?? '?').toUpperCase()}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={option.primary}
                          secondary={`${option.extra ?? ""} ${option.extra ? '|' : ''} טווח מחירים: ${option.priceRange ?? "לא ידוע"}`}
                          primaryTypographyProps={{ sx: { color: 'var(--primary-color)' } }}
                          secondaryTypographyProps={{ sx: { color: 'var(--primary-color)', opacity: .8 } }}
                        />
                      </ListItem>
                    </li>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      variant='outlined'
                      fullWidth
                      placeholder='Item name..'
                      error={!!errors.itemName}
                      helperText={errors.itemName?.message}
                      sx={{
                        overflow: 'visible',
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'var(--note-card-background-card-item)',
                          color: 'var(--primary-color)',
                          borderRadius: '5px',
                          '& fieldset': { borderColor: 'var(--borders-color)' },
                          '&:hover fieldset': { borderColor: 'var(--borders-color)' },
                          '&.Mui-focused fieldset': { borderColor: 'var(--secondary-color)' }
                        },
                        '& .MuiInputBase-input': {
                          padding: '1.2em 1.2em',
                          fontSize: '1rem',
                          color: 'var(--primary-color)'
                        },
                        '& .MuiInputBase-input::placeholder': {
                          color: 'var(--primary-color)',
                          opacity: .7
                        },
                        '& .MuiInputAdornment-root': {
                          color: 'var(--primary-color)'
                        }
                      }}
                      InputProps={{
                        ...params.InputProps,
                        onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
                          params.inputProps?.onFocus?.(e)
                          if (comparePrices && canOpen(itemNameLive) && (options.length > 0 || hadError || acLoading)) {
                            setAcOpen(true)
                          }
                        },
                        onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
                          params.inputProps?.onBlur?.(e)
                          setAcOpen(false)
                        },
                        startAdornment: (
                          <InputAdornment position='start' sx={{ pl: .5 }}>
                            <MdOutlineDriveFileRenameOutline />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <>
                            {(acLoading && isHebrew(itemNameLive) && itemNameLive.trim().length >= 3)
                              ? <CircularProgress size={18} sx={{ mr: 1, color: 'var(--primary-color)' }} />
                              : null}
                            {params.InputProps.endAdornment}
                          </>
                        )
                      }}
                    />
                  )}
                />
              )}
            />

            {/* check box to enable price comparison */}
            <Box>
              <FormControl component='fieldset' variant='standard'>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={comparePrices}
                      onChange={(e) => setComparePrices(e.target.checked)}
                      sx={{ color: 'var(--secondary-color)', '&.Mui-checked': { color: 'var(--secondary-color)' } }}
                    />
                  }
                  label={
                    <Typography sx={{ color: 'var(--primary-color)' }}>
                      Compare prices
                    </Typography>
                  }
                />
              </FormControl>
            </Box>

            {selectedProduct && comparePrices && <div style={{ display: 'flex', gap: 8 }}>
              {/* Actions row under the input */}
              {selectedProduct && comparePrices && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Button
                    variant="text"
                    onClick={() => fetchPrices()}
                    disabled={!selectedProduct || pricesLoading}
                    sx={{
                      color: 'var(--secondary-color)'
                    }}
                  >
                    {pricesLoading ? 'Loading…' : 'View prices'}
                  </Button>
                </Box>
              )}

              {/* close table button */}
              {comparePrices && pricesRows && pricesRows.length > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Button
                    variant="text"
                    onClick={() => setPricesRows(null)}
                    sx={{
                      color: 'var(--primary-color)'
                    }}
                  >
                    Close prices
                  </Button>
                </Box>
              )}
            </div>}

            {/* Prices table / states */}
            {comparePrices && (pricesLoading || pricesError || pricesRows) && (
              <Box sx={{ maxHeight: '350px', overflowY: 'auto', pr: 0.5 }}>
                {pricesLoading && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center', height: '2.5em' }}>
                    <CircularProgress size={18} sx={{ color: 'var(--primary-color)' }} />
                    <Typography sx={{ color: 'var(--primary-color)', textAlign: 'center' }}>Loading prices…</Typography>
                  </Box>
                )}

                {!pricesLoading && pricesError && (
                  <Typography sx={{ color: 'var(--primary-color)', textAlign: 'center' }}>
                    Error loading prices!
                  </Typography>
                )}

                {!pricesLoading && !pricesError && pricesRows && (
                  pricesRows.length === 0 ? (
                    <Typography sx={{ color: 'var(--primary-color)' }}>
                      No prices found for this product in the selected area.
                    </Typography>
                  ) : (
                    <TableContainer
                      component={Paper}
                      sx={{
                        mt: 1,
                        bgcolor: 'var(--note-card-background-card-item)',
                        border: '1px solid var(--borders-color)'
                      }}
                    >
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ color: 'var(--primary-color)', borderColor: 'var(--borders-color)', fontWeight: 'bold' }}>רשת</TableCell>
                            <TableCell align="right" sx={{ color: 'var(--primary-color)', borderColor: 'var(--borders-color)', fontWeight: 'bold' }}>מחיר</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {pricesRows.map((row, idx) => (
                            <TableRow key={`${row.chain}-${row.branch}-${idx}`}>
                              {/* Chain (+ branch on mobile) */}
                              <TableCell sx={{ color: 'var(--primary-color)', borderColor: 'var(--borders-color)' }}>
                                {row.chain}
                                {/* show branch beneath on mobile */}
                                {row.branch && (
                                  <Typography variant="body2" sx={{ display: 'block', opacity: .8 }}>
                                    {row.branch}
                                  </Typography>
                                )}
                                {/* optional: show short sale chip on mobile */}
                                {row.salePrice && (
                                  <Chip
                                    size="small"
                                    label={`מבצע: ${row.salePrice}`}
                                    sx={{ display: 'inline-flex', ml: 0.5, mt: 0.5,
                                    bgcolor: 'var(--secondary-color-faded)', color: 'var(--primary-color)', border: '1px solid var(--borders-color)' }}
                                  />
                                )}
                              </TableCell>

                              {/* Price */}
                              <TableCell align="right" sx={{ color: 'var(--primary-color)', borderColor: 'var(--borders-color)' }}>
                                {row.price ?? '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )
                )}
              </Box>
            )}

            <DialogActions sx={{ padding: 0, display: 'flex' }}>
              <Button
                sx={{ marginRight: 'auto' }}
                className={styles.renamePopupBtn}
                onClick={() => setOpenAddNoteItemOptionsTab(!openAddNoteItemOptionsTab)}
                startIcon={
                  <MotionWrap
                    style={{ display: 'flex' }}
                    animate={controls}
                    transition={{ duration: 2, type: 'spring', stiffness: 200, damping: 20 }}
                  >
                    <IoMdArrowDropdown />
                  </MotionWrap>
                }
              >
                Options
              </Button>

              <Button className={styles.renamePopupBtn} type='submit'>
                {loading ? <CircularProgress color='inherit' size={22} /> : 'Add'}
              </Button>
              <Button className={styles.renamePopupBtn} onClick={handleClose}>Cancel</Button>
            </DialogActions>
          </form>
        </DialogContent>

        <AnimatePresence>
          {openAddNoteItemOptionsTab && (
            <MotionWrap
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              transition={{ duration: 2, type: 'spring', stiffness: 100, damping: 20 }}
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
                  <FormControlLabel className={styles.noneCheckboxLabel} value='none' control={<MuiRadio className={styles.noneCheckBox} />} label='None' labelPlacement='end' />
                  <FormControlLabel className={styles.greenCheckboxLabel} value='green' control={<MuiRadio className={styles.greenCheckBox} />} label='Not urgent' labelPlacement='end' />
                  <FormControlLabel className={styles.yellowCheckboxLabel} value='yellow' control={<MuiRadio className={styles.yellowCheckBox} />} label='Mildly urgent' labelPlacement='end' />
                  <FormControlLabel className={styles.redCheckboxLabel} value='red' control={<MuiRadio className={styles.redCheckBox} />} label='Urgent' labelPlacement='end' />
                </RadioGroup>
              </div>

              <div className={styles.addNoteItemOptionsAddCategoryContainer}>
                <p className={styles.addNoteItemOptionsAddCategoryTitle}>
                  Add category
                </p>
                <FormControl fullWidth>
                  <InputLabel className={styles.selectLabel} id='select-item-category'>Category</InputLabel>
                  <Select
                    labelId='select-item-category-label'
                    id='select-item-category'
                    MenuProps={{ classes: { paper: styles.selectMenuPaper } }}
                    inputProps={{ classes: { icon: styles.selectIcon } }}
                    value={selectedCategory}
                    label='Category'
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <MenuItem className={styles.selectMenuItem} value='none'>None</MenuItem>
                    <Divider sx={{ boxShadow: '0px 0px 15px 0px #39393933' }} />
                    <MenuItem disabled className={styles.selectMenuItem} value='general'>Groceries</MenuItem>
                    <Divider sx={{ boxShadow: '0px 0px 15px 0px #39393933' }} />
                    {foodCategories.map((category, index) => (
                      <MenuItem key={index} className={styles.selectMenuItem} value={category}>{category}</MenuItem>
                    ))}
                    <Divider sx={{ boxShadow: '0px 0px 15px 0px #39393933' }} />
                    <MenuItem disabled className={styles.selectMenuItem} value='general'>General</MenuItem>
                    <Divider sx={{ boxShadow: '0px 0px 15px 0px #39393933' }} />
                    {generalCategories.map((category, index) => (
                      <MenuItem key={index} className={styles.selectMenuItem} value={category}>{category}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>
            </MotionWrap>
          )}
        </AnimatePresence>
      </Dialog>
    </div>
  )
}