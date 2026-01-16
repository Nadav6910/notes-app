'use client'

import { useState, useMemo } from 'react'
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Typography, Chip, Box, IconButton, Collapse, Tooltip
} from '@mui/material'
import { IoMdArrowDropup, IoMdArrowDropdown } from 'react-icons/io'
import { MdExpandMore, MdExpandLess, MdLocalOffer } from 'react-icons/md'
import { FaCrown } from 'react-icons/fa'

type StorePriceRow = {
  chain: string
  branch: string
  address: string | null
  salePrice: string | null
  saleTitle: string | null
  saleDesc: string | null
  price: string | null
}

type SortField = 'price' | 'chain' | 'salePrice'
type SortOrder = 'asc' | 'desc'

interface PriceComparisonTableProps {
  rows: StorePriceRow[]
  locale?: 'en' | 'he'
}

export default function PriceComparisonTable({
  rows,
  locale = 'he'
}: PriceComparisonTableProps) {
  const [sortField, setSortField] = useState<SortField>('price')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      if (sortField === 'chain') {
        return sortOrder === 'asc'
          ? a.chain.localeCompare(b.chain, 'he')
          : b.chain.localeCompare(a.chain, 'he')
      }

      // For price sorting, use sale price if available, otherwise regular price
      const getEffectivePrice = (row: StorePriceRow) => {
        if (sortField === 'salePrice') {
          return row.salePrice ? parseFloat(row.salePrice) : 999999
        }
        // For 'price', prefer sale price for sorting (actual best price)
        const sale = row.salePrice ? parseFloat(row.salePrice) : null
        const regular = row.price ? parseFloat(row.price) : null
        if (sale !== null && regular !== null) {
          return Math.min(sale, regular)
        }
        return sale ?? regular ?? 999999
      }

      const aVal = getEffectivePrice(a)
      const bVal = getEffectivePrice(b)

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
    })
  }, [rows, sortField, sortOrder])

  const cheapestPrice = useMemo(() => {
    const prices = rows
      .map(r => {
        const sale = r.salePrice ? parseFloat(r.salePrice) : null
        const regular = r.price ? parseFloat(r.price) : null
        if (sale !== null && regular !== null) return Math.min(sale, regular)
        return sale ?? regular ?? 999999
      })
      .filter(p => !isNaN(p) && p < 999999)
    return prices.length > 0 ? Math.min(...prices) : null
  }, [rows])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const toggleExpand = (idx: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(idx)) {
        next.delete(idx)
      } else {
        next.add(idx)
      }
      return next
    })
  }

  const SortIcon = ({ field }: { field: SortField }) =>
    sortField === field ? (
      sortOrder === 'asc' ? (
        <IoMdArrowDropup size={18} />
      ) : (
        <IoMdArrowDropdown size={18} />
      )
    ) : null

  const getEffectivePrice = (row: StorePriceRow) => {
    const sale = row.salePrice ? parseFloat(row.salePrice) : null
    const regular = row.price ? parseFloat(row.price) : null
    if (sale !== null && regular !== null) return Math.min(sale, regular)
    return sale ?? regular ?? null
  }

  return (
    <TableContainer
      component={Paper}
      sx={{
        mt: 1,
        bgcolor: 'var(--note-card-background-card-item)',
        border: '1px solid var(--borders-color)',
        borderRadius: 2,
        maxHeight: 380,
        overflow: 'auto',
        '&::-webkit-scrollbar': {
          width: '6px'
        },
        '&::-webkit-scrollbar-thumb': {
          bgcolor: 'var(--borders-color)',
          borderRadius: '3px'
        }
      }}
    >
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            {/* Expand column */}
            <TableCell
              sx={{
                width: 40,
                p: 0.5,
                bgcolor: 'var(--menu-background-color)',
                borderColor: 'var(--borders-color)'
              }}
            />

            {/* Chain column */}
            <TableCell
              onClick={() => toggleSort('chain')}
              sx={{
                cursor: 'pointer',
                color: 'var(--primary-color)',
                bgcolor: 'var(--menu-background-color)',
                borderColor: 'var(--borders-color)',
                fontWeight: 'bold',
                '&:hover': { bgcolor: 'var(--secondary-color-faded)' }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {locale === 'he' ? 'רשת' : 'Chain'}
                <SortIcon field="chain" />
              </Box>
            </TableCell>

            {/* Sale column */}
            <TableCell
              align="center"
              onClick={() => toggleSort('salePrice')}
              sx={{
                cursor: 'pointer',
                color: 'var(--primary-color)',
                bgcolor: 'var(--menu-background-color)',
                borderColor: 'var(--borders-color)',
                fontWeight: 'bold',
                '&:hover': { bgcolor: 'var(--secondary-color-faded)' }
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.5
                }}
              >
                {locale === 'he' ? 'מבצע' : 'Sale'}
                <SortIcon field="salePrice" />
              </Box>
            </TableCell>

            {/* Price column */}
            <TableCell
              align="right"
              onClick={() => toggleSort('price')}
              sx={{
                cursor: 'pointer',
                color: 'var(--primary-color)',
                bgcolor: 'var(--menu-background-color)',
                borderColor: 'var(--borders-color)',
                fontWeight: 'bold',
                '&:hover': { bgcolor: 'var(--secondary-color-faded)' }
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 0.5
                }}
              >
                {locale === 'he' ? 'מחיר' : 'Price'}
                <SortIcon field="price" />
              </Box>
            </TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {sortedRows.map((row, idx) => {
            const effectivePrice = getEffectivePrice(row)
            const isCheapest = cheapestPrice !== null && effectivePrice === cheapestPrice
            const isExpanded = expandedRows.has(idx)
            const hasDetails = row.address || row.saleTitle || row.saleDesc

            return (
              <Box component="tbody" key={`${row.chain}-${row.branch}-${idx}`}>
                <TableRow
                  sx={{
                    bgcolor: isCheapest
                      ? 'rgba(76, 175, 80, 0.12)'
                      : 'inherit',
                    transition: 'background-color 0.2s',
                    '&:hover': {
                      bgcolor: isCheapest
                        ? 'rgba(76, 175, 80, 0.18)'
                        : 'var(--secondary-color-faded)'
                    }
                  }}
                >
                  {/* Expand button */}
                  <TableCell sx={{ p: 0.5, borderColor: 'var(--borders-color)' }}>
                    {hasDetails && (
                      <IconButton
                        size="small"
                        onClick={() => toggleExpand(idx)}
                        sx={{ color: 'var(--primary-color)' }}
                      >
                        {isExpanded ? <MdExpandLess /> : <MdExpandMore />}
                      </IconButton>
                    )}
                  </TableCell>

                  {/* Chain & Branch */}
                  <TableCell
                    sx={{
                      color: 'var(--primary-color)',
                      borderColor: 'var(--borders-color)'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {isCheapest && (
                        <Tooltip title={locale === 'he' ? 'הכי זול!' : 'Cheapest!'}>
                          <Box sx={{ display: 'flex', color: '#ffc107' }}>
                            <FaCrown size={14} />
                          </Box>
                        </Tooltip>
                      )}
                      <Box>
                        <Typography
                          variant="body2"
                          fontWeight={isCheapest ? 'bold' : 'normal'}
                          sx={{ color: 'var(--primary-color)' }}
                        >
                          {row.chain}
                        </Typography>
                        {row.branch && (
                          <Typography
                            variant="caption"
                            sx={{ color: 'var(--primary-color)', opacity: 0.7, display: 'block' }}
                          >
                            {row.branch}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>

                  {/* Sale Price */}
                  <TableCell
                    align="center"
                    sx={{
                      color: 'var(--primary-color)',
                      borderColor: 'var(--borders-color)'
                    }}
                  >
                    {row.salePrice && (
                      <Chip
                        size="small"
                        icon={<MdLocalOffer size={14} />}
                        label={`₪${row.salePrice}`}
                        sx={{
                          bgcolor: '#ff9800',
                          color: 'white',
                          fontWeight: 'bold',
                          '& .MuiChip-icon': { color: 'white' }
                        }}
                      />
                    )}
                  </TableCell>

                  {/* Regular Price */}
                  <TableCell
                    align="right"
                    sx={{
                      color: 'var(--primary-color)',
                      borderColor: 'var(--borders-color)'
                    }}
                  >
                    <Typography
                      fontWeight={isCheapest && !row.salePrice ? 'bold' : 'normal'}
                      sx={{
                        textDecoration: row.salePrice ? 'line-through' : 'none',
                        opacity: row.salePrice ? 0.6 : 1,
                        color: 'var(--primary-color)'
                      }}
                    >
                      {row.price ? `₪${row.price}` : '—'}
                    </Typography>
                  </TableCell>
                </TableRow>

                {/* Expandable details */}
                {hasDetails && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      sx={{ p: 0, borderColor: 'var(--borders-color)' }}
                    >
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box
                          sx={{
                            p: 2,
                            bgcolor: 'var(--secondary-color-faded)',
                            borderTop: '1px solid var(--borders-color)'
                          }}
                        >
                          {row.address && (
                            <Typography
                              variant="body2"
                              sx={{ color: 'var(--primary-color)', mb: 0.5 }}
                            >
                              <strong>{locale === 'he' ? 'כתובת:' : 'Address:'}</strong>{' '}
                              {row.address}
                            </Typography>
                          )}
                          {row.saleTitle && (
                            <Typography
                              variant="body2"
                              sx={{ color: 'var(--primary-color)', mb: 0.5 }}
                            >
                              <strong>{locale === 'he' ? 'מבצע:' : 'Sale:'}</strong>{' '}
                              {row.saleTitle}
                            </Typography>
                          )}
                          {row.saleDesc && (
                            <Typography
                              variant="caption"
                              sx={{
                                color: 'var(--primary-color)',
                                opacity: 0.8,
                                display: 'block'
                              }}
                            >
                              {row.saleDesc}
                            </Typography>
                          )}
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                )}
              </Box>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
