import styles from '../../app/my-notes/styles/myNotes.module.css'
import { useState, useEffect, useRef, forwardRef } from 'react'
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, Slide,
  CircularProgress, FormControlLabel, RadioGroup, FormControl, Radio as MuiRadio,
  InputLabel, Select, MenuItem, Divider, TextField, Autocomplete,
  ListItem, ListItemAvatar, Avatar, ListItemText, InputAdornment, Box,
  Checkbox, Typography
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
import { classifyError, type PriceError } from '@/lib/error-types'
import PriceLoadingIndicator, { type LoadingStage } from './PriceLoadingIndicator'
import PriceComparisonTable from './PriceComparisonTable'
import PriceEmptyState from './PriceEmptyState'
import PriceErrorDisplay from './PriceErrorDisplay'

const Transition = forwardRef(function Transition (
  props: TransitionProps & { children: React.ReactElement<any, any> },
  ref: React.Ref<unknown>
) {
  return <Slide direction='up' ref={ref} {...props} />
})

type SelectedProduct = {
  name: string
  barcode: string | null
  href: string | null
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
  | { ok: true, count: number, rows: StorePriceRow[], cached?: boolean }
  | { ok: false, error: string, errorType?: string, retryAfterMs?: number }

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
  const [loadingStage, setLoadingStage] = useState<LoadingStage>('connecting')
  const [pricesError, setPricesError] = useState<PriceError | null>(null)
  const [pricesRows, setPricesRows] = useState<StorePriceRow[] | null>(null)

  const [acOpen, setAcOpen] = useState(false)
  const [acLoading, setAcLoading] = useState(false)
  const [options, setOptions] = useState<AutocompleteSuggestion[]>([])
  const [inputValue, setInputValue] = useState('')
  const [hadError, setHadError] = useState(false)
  const [searchComplete, setSearchComplete] = useState(false) // tracks when a search finished (for showing empty results)

  const { city } = useHebrewCity({
    preferGPS: true,
    enabled: comparePrices,
    fallback: 'תל אביב'
  })

  const abortRef = useRef<AbortController | null>(null)
  const pricesAbortRef = useRef<AbortController | null>(null)
  const controls = useAnimationControls()

  // Pre-warm browser when compare prices is enabled
  useEffect(() => {
    if (comparePrices) {
      fetch('/api/price-service-warmup', { method: 'POST' }).catch(() => {})
    }
  }, [comparePrices])

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
    // Cancel any in-flight requests
    abortRef.current?.abort()
    pricesAbortRef.current?.abort()
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

      if (data.message === 'success') {
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

    // Cancel any previous request
    pricesAbortRef.current?.abort()
    const controller = new AbortController()
    pricesAbortRef.current = controller

    setPricesLoading(true)
    setPricesError(null)
    setLoadingStage('connecting')

    // Update loading stages based on time
    const stageTimers = [
      setTimeout(() => setLoadingStage('searching'), 2000),
      setTimeout(() => setLoadingStage('fetching'), 6000),
      setTimeout(() => setLoadingStage('processing'), 12000)
    ]

    try {
      const res = await fetch('/api/get-product-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: p.name,
          barcode: p.barcode,
          locationName: city,
        }),
        signal: controller.signal
      })

      // Clear stage timers
      stageTimers.forEach(t => clearTimeout(t))

      const data: GetPricesResponse = await res.json()

      if (data.ok) {
        setPricesRows(data.rows)
      } else {
        setPricesRows([])
        const classified = classifyError(data.error || 'Unknown error', data.retryAfterMs)
        setPricesError(classified)
      }
    } catch (e: any) {
      // Clear stage timers
      stageTimers.forEach(t => clearTimeout(t))

      if (e.name === 'AbortError') {
        // User cancelled - don't show error
        return
      }
      setPricesRows([])
      const classified = classifyError(e?.message || 'Network error')
      setPricesError(classified)
    } finally {
      setPricesLoading(false)
      pricesAbortRef.current = null
    }
  }

  const handleCancelPricesFetch = () => {
    pricesAbortRef.current?.abort()
    setPricesLoading(false)
  }

  // Value the user sees in the input
  const itemNameLive = watch('itemName', '')

  // Only scrape on Hebrew input, after debounce
  const debouncedQuery = useDebouncedValue(inputValue, DEBOUNCE_MS)

  const isHebrew = (s: string) => /[\u0590-\u05FF]/.test(s)
  const cropName = (s: string) => s.split(/[,،‚，]/)[0].trim()
  const canOpen = (s: string) => /[\u0590-\u05FF]/.test(s) && s.trim().length >= 3

  useEffect(() => {
    const q = debouncedQuery.trim()

    // Block all scraping when comparePrices is off
    if (!comparePrices) {
      setOptions([])
      setAcLoading(false)
      setHadError(false)
      setSearchComplete(false)
      setAcOpen(false)
      abortRef.current?.abort()
      return
    }

    // Only Hebrew + length >= 3 will trigger scraping/open
    if (q.length < 3 || !isHebrew(q)) {
      setOptions([])
      setAcLoading(false)
      setHadError(false)
      setSearchComplete(false)
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
      setSearchComplete(false)
      try {
        console.log('[Autocomplete] Starting search for:', q)
        const res = await fetch('/api/auto-complete-products-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemName: q, locationName: city }),
          signal: ac.signal
        })

        console.log('[Autocomplete] Response status:', res.status)
        const data = await res.json()
        console.log('[Autocomplete] Response data:', { ok: data?.ok, count: data?.count, error: data?.error })

        if (data?.ok) {
          const raw: AutocompleteSuggestion[] = data.suggestions ?? []
          const trimmed = raw.length > 1 ? raw.slice(0, -1) : raw
          console.log('[Autocomplete] Got', trimmed.length, 'suggestions')
          setOptions(trimmed)
          setHadError(false)
          setSearchComplete(true)
          setAcOpen(true)
        } else {
          // API returned an error - show error state
          console.error('[Autocomplete] API error:', data?.error, 'errorType:', data?.errorType)
          setOptions([])
          setHadError(true)
          setSearchComplete(true)
          setAcOpen(true)
        }
      } catch (err: any) {
        if (!ac.signal.aborted) {
          console.error('[Autocomplete] Fetch error:', err?.message)
          setHadError(true)
          setOptions([])
          setSearchComplete(true)
          setAcOpen(true)
        }
      } finally {
        setAcLoading(false)
      }
    }

    run()
  }, [comparePrices, debouncedQuery, city])

  // Reset everything when closing popup or turning off comparePrices
  useEffect(() => {
    if (!comparePrices) {
      abortRef.current?.abort()
      pricesAbortRef.current?.abort()
      setAcOpen(false)
      setOptions([])
      setAcLoading(false)
      setHadError(false)
      setSearchComplete(false)
      setSelectedProduct(null)
      setPricesRows(null)
      setPricesError(null)
      setPricesLoading(false)
    }
  }, [comparePrices])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      pricesAbortRef.current?.abort()
    }
  }, [])

  return (
    <div>
      <Dialog
        open={isOpen}
        TransitionComponent={Transition}
        keepMounted
        onClose={handleClose}
        aria-describedby='alert-dialog-slide-description'
        maxWidth={pricesRows && pricesRows.length > 0 ? 'lg' : 'sm'}
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
                  inputValue={itemNameLive}
                  onClose={(_, reason) => {
                    if (reason === 'blur' || reason === 'toggleInput' || reason === 'escape') {
                      setAcOpen(false)
                    }
                  }}
                  open={
                    acOpen &&
                    canOpen(itemNameLive) &&
                    (options.length > 0 || hadError || acLoading || searchComplete)
                  }
                  options={options}
                  loading={acLoading}
                  loadingText='מחפש מוצרים...'
                  noOptionsText={hadError ? 'שגיאה בחיפוש - נסה שוב' : 'לא נמצאו מוצרים'}
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
                  onInputChange={(_, val, reason) => {
                    if (!comparePrices) {
                      field.onChange(val)
                      setInputValue('')
                      setOptions([])
                      setAcLoading(false)
                      setHadError(false)
                      setSearchComplete(false)
                      setAcOpen(false)
                      setSelectedProduct(null)
                      setPricesRows(null)
                      setPricesError(null)
                      return
                    }

                    if (reason === 'input') {
                      setSelectedProduct(null)
                      setPricesRows(null)
                      setPricesError(null)

                      if (isHebrew(val)) {
                        setInputValue(val)
                        setAcLoading(true)
                        setHadError(false)
                        setSearchComplete(false)
                        field.onChange(val)
                        setAcOpen(val.trim().length >= 3)
                      } else {
                        setInputValue('')
                        setOptions([])
                        setAcLoading(false)
                        setHadError(false)
                        setSearchComplete(false)
                        field.onChange(val)
                        setAcOpen(false)
                      }
                    } else if (reason === 'clear') {
                      setSelectedProduct(null)
                      setPricesRows(null)
                      setPricesError(null)
                      setInputValue('')
                      setOptions([])
                      setAcLoading(false)
                      setHadError(false)
                      setSearchComplete(false)
                      field.onChange('')
                      setAcOpen(false)
                    }
                  }}
                  onChange={(_, val) => {
                    if (typeof val === 'string') {
                      const cropped = cropName(val)
                      field.onChange(cropped)
                      setSelectedProduct(null)
                      setPricesRows(null)
                      setPricesError(null)
                    } else if (val) {
                      const cropped = cropName(val.primary)
                      field.onChange(cropped)

                      const chosen: SelectedProduct = {
                        name: val.primary,
                        barcode: val.barcode ?? null,
                        href: val.href ?? null
                      }
                      setSelectedProduct(chosen)
                      setAcOpen(false)
                    }
                  }}
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
                      placeholder='שם פריט..'
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
                          if (comparePrices && canOpen(itemNameLive) && (options.length > 0 || hadError || acLoading || searchComplete)) {
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

            {/* Compare prices checkbox */}
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
                      השווה מחירים
                    </Typography>
                  }
                />
              </FormControl>
            </Box>

            {/* Actions row */}
            {selectedProduct && comparePrices && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => fetchPrices()}
                  disabled={!selectedProduct || pricesLoading}
                  sx={{
                    color: 'var(--secondary-color)',
                    borderColor: 'var(--secondary-color)',
                    textTransform: 'none',
                    '&:hover': {
                      borderColor: 'var(--secondary-color)',
                      bgcolor: 'var(--secondary-color-faded)'
                    }
                  }}
                >
                  {pricesLoading ? 'טוען...' : 'הצג מחירים'}
                </Button>

                {pricesRows && pricesRows.length > 0 && (
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => setPricesRows(null)}
                    sx={{
                      color: 'var(--primary-color)',
                      textTransform: 'none'
                    }}
                  >
                    סגור מחירים
                  </Button>
                )}
              </Box>
            )}

            {/* Prices display area */}
            {comparePrices && (pricesLoading || pricesError || pricesRows) && (
              <Box sx={{ mt: 1 }}>
                {/* Loading state with progress */}
                {pricesLoading && (
                  <PriceLoadingIndicator
                    stage={loadingStage}
                    estimatedTimeMs={20000}
                    onCancel={handleCancelPricesFetch}
                    locale="he"
                  />
                )}

                {/* Error state */}
                {!pricesLoading && pricesError && (
                  <PriceErrorDisplay
                    error={pricesError}
                    onRetry={() => fetchPrices()}
                    locale="he"
                  />
                )}

                {/* Results */}
                {!pricesLoading && !pricesError && pricesRows && (
                  pricesRows.length === 0 ? (
                    <PriceEmptyState
                      productName={selectedProduct?.name ?? undefined}
                      location={city ?? undefined}
                      onRetry={() => fetchPrices()}
                      locale="he"
                    />
                  ) : (
                    <PriceComparisonTable
                      rows={pricesRows}
                      locale="he"
                    />
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
                אפשרויות
              </Button>

              <Button className={styles.renamePopupBtn} type='submit'>
                {loading ? <CircularProgress color='inherit' size={22} /> : 'הוסף'}
              </Button>
              <Button className={styles.renamePopupBtn} onClick={handleClose}>ביטול</Button>
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
                  בחר צבע עדיפות
                </p>
                <RadioGroup
                  value={selectedPriorityColor}
                  className={styles.addNoteItemOptionsSelectPriorityContainer}
                  onChange={(e) => setSelectedPriorityColor(e.target.value)}
                >
                  <FormControlLabel className={styles.noneCheckboxLabel} value='none' control={<MuiRadio className={styles.noneCheckBox} />} label='ללא' labelPlacement='end' />
                  <FormControlLabel className={styles.greenCheckboxLabel} value='green' control={<MuiRadio className={styles.greenCheckBox} />} label='לא דחוף' labelPlacement='end' />
                  <FormControlLabel className={styles.yellowCheckboxLabel} value='yellow' control={<MuiRadio className={styles.yellowCheckBox} />} label='דחיפות בינונית' labelPlacement='end' />
                  <FormControlLabel className={styles.redCheckboxLabel} value='red' control={<MuiRadio className={styles.redCheckBox} />} label='דחוף' labelPlacement='end' />
                </RadioGroup>
              </div>

              <div className={styles.addNoteItemOptionsAddCategoryContainer}>
                <p className={styles.addNoteItemOptionsAddCategoryTitle}>
                  הוסף קטגוריה
                </p>
                <FormControl fullWidth>
                  <InputLabel className={styles.selectLabel} id='select-item-category'>קטגוריה</InputLabel>
                  <Select
                    labelId='select-item-category-label'
                    id='select-item-category'
                    MenuProps={{ classes: { paper: styles.selectMenuPaper } }}
                    inputProps={{ classes: { icon: styles.selectIcon } }}
                    value={selectedCategory}
                    label='קטגוריה'
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <MenuItem className={styles.selectMenuItem} value='none'>ללא</MenuItem>
                    <Divider sx={{ boxShadow: '0px 0px 15px 0px #39393933' }} />
                    <MenuItem disabled className={styles.selectMenuItem} value='general'>מצרכים</MenuItem>
                    <Divider sx={{ boxShadow: '0px 0px 15px 0px #39393933' }} />
                    {foodCategories.map((category, index) => (
                      <MenuItem key={index} className={styles.selectMenuItem} value={category}>{category}</MenuItem>
                    ))}
                    <Divider sx={{ boxShadow: '0px 0px 15px 0px #39393933' }} />
                    <MenuItem disabled className={styles.selectMenuItem} value='general'>כללי</MenuItem>
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
