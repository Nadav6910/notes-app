'use client'

import { useEffect, useMemo, useReducer, useRef } from 'react'
import { motion } from 'framer-motion'
import styles from './ScrapeProgress.module.css'

// Mirror of the backend event shape from /api/get-product-prices?stream=1.
export type StepKey =
  | 'launching'
  | 'locating'
  | 'searching-product'
  | 'submitting'
  | 'extracting'
  | 'done'

export type ScrapeProgressEvent = {
  step: StepKey | 'error' | 'cache-hit'
  label?: string
  progress?: number
  durationMs?: number
  partial?: { rows?: any[] }
  error?: { code: string; message: string }
  result?: any
}

type StepState = 'pending' | 'active' | 'done' | 'error'

type StepDef = {
  key: StepKey
  title: string
  hint?: string
  emoji: string
}

const STEPS: StepDef[] = [
  { key: 'locating',          title: 'Locating you',         hint: 'Confirming your area',          emoji: '🛰️' },
  { key: 'launching',         title: 'Exploring the web',    hint: 'Launching browser session',     emoji: '🚀' },
  { key: 'searching-product', title: 'Searching product',    hint: 'Autocomplete + submit',         emoji: '🔎' },
  { key: 'submitting',        title: 'Comparing stores',     hint: 'Letting the page do its work',  emoji: '📡' },
  { key: 'extracting',        title: 'Extracting prices',    hint: 'Parsing the results table',     emoji: '📊' },
  { key: 'done',              title: 'Done',                 hint: 'Handing off to the table',      emoji: '✅' },
]

// Map every backend step to the index in STEPS so we can drive the stepper
// even when the backend skips one (e.g. cache-hit or partial flows).
const STEP_INDEX: Record<StepKey, number> = STEPS.reduce((acc, s, i) => {
  acc[s.key] = i
  return acc
}, {} as Record<StepKey, number>)

interface ProgressState {
  states: StepState[]
  durations: (number | null)[]   // ms each step took (per-step elapsed)
  startedAt: number[]            // ms (relative to t0) when step became active
  partial: any[] | null
  error: { code: string; message: string } | null
  totalDurationMs: number
}

const initialState = (): ProgressState => ({
  states: STEPS.map(() => 'pending'),
  durations: STEPS.map(() => null),
  startedAt: STEPS.map(() => -1),
  partial: null,
  error: null,
  totalDurationMs: 0,
})

type Action =
  | { type: 'event'; event: ScrapeProgressEvent }
  | { type: 'tick'; ms: number }
  | { type: 'reset' }

function reducer(state: ProgressState, action: Action): ProgressState {
  if (action.type === 'reset') return initialState()
  if (action.type === 'tick') return { ...state, totalDurationMs: action.ms }

  const e = action.event
  const total = e.durationMs ?? state.totalDurationMs

  if (e.step === 'error') {
    // mark the currently active step as error; leave done steps alone
    const states = state.states.slice()
    const activeIdx = states.indexOf('active')
    if (activeIdx >= 0) states[activeIdx] = 'error'
    else {
      // no active step yet — flag the first non-done one
      const firstPending = states.indexOf('pending')
      if (firstPending >= 0) states[firstPending] = 'error'
    }
    return {
      ...state,
      states,
      error: e.error ?? null,
      totalDurationMs: total,
    }
  }

  if (e.step === 'cache-hit') {
    return {
      ...state,
      states: STEPS.map(() => 'done'),
      totalDurationMs: total,
    }
  }

  const idx = STEP_INDEX[e.step as StepKey]
  if (idx === undefined) return { ...state, totalDurationMs: total }

  const states = state.states.slice()
  const durations = state.durations.slice()
  const startedAt = state.startedAt.slice()

  // mark every step before idx as done
  for (let i = 0; i < idx; i++) {
    if (states[i] !== 'done' && states[i] !== 'error') {
      states[i] = 'done'
      if (durations[i] === null) {
        const start = startedAt[i] >= 0 ? startedAt[i] : total
        durations[i] = Math.max(0, total - start)
      }
    }
  }

  // step idx becomes active (or done if we're at the final 'done' step)
  if (e.step === 'done') {
    states[idx] = 'done'
    if (durations[idx] === null) {
      const start = startedAt[idx] >= 0 ? startedAt[idx] : total
      durations[idx] = Math.max(0, total - start)
    }
  } else {
    if (states[idx] !== 'done' && states[idx] !== 'error') {
      states[idx] = 'active'
      if (startedAt[idx] < 0) startedAt[idx] = total
    }
  }

  return {
    ...state,
    states,
    durations,
    startedAt,
    partial: e.partial?.rows ?? state.partial,
    totalDurationMs: total,
  }
}

function fmtMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return ''
  if (ms < 1_000) return `${ms}ms`
  return `${(ms / 1_000).toFixed(1)}s`
}

interface Props {
  /** Stream of events from the NDJSON endpoint, in arrival order. */
  events: ScrapeProgressEvent[]
  /** True if the request hasn't produced an error or 'done' yet. Used to drive the live elapsed timer. */
  active: boolean
  className?: string
}

export default function ScrapeProgress({ events, active, className }: Props) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  const lastEventCount = useRef(0)
  const t0 = useRef<number>(0)

  // Apply newly arrived events.
  useEffect(() => {
    if (events.length === 0) {
      dispatch({ type: 'reset' })
      lastEventCount.current = 0
      t0.current = performance.now()
      return
    }
    if (events.length < lastEventCount.current) {
      // events array shrank — we restarted; reset
      dispatch({ type: 'reset' })
      lastEventCount.current = 0
      t0.current = performance.now()
    }
    for (let i = lastEventCount.current; i < events.length; i++) {
      dispatch({ type: 'event', event: events[i] })
    }
    lastEventCount.current = events.length
  }, [events])

  // Live tick for the total elapsed timer while we're still scraping.
  useEffect(() => {
    if (!active) return
    if (t0.current === 0) t0.current = performance.now()
    let raf = 0
    const tick = () => {
      dispatch({ type: 'tick', ms: Math.round(performance.now() - t0.current) })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active])

  // Position of the "thread fill" — count how many steps are done.
  const fillFraction = useMemo(() => {
    const lastIdx = state.states.length - 1
    let firstActive = state.states.findIndex(s => s === 'active' || s === 'error')
    if (firstActive < 0) {
      firstActive = state.states.lastIndexOf('done')
      if (firstActive < 0) firstActive = 0
    }
    return Math.min(1, Math.max(0, firstActive / lastIdx))
  }, [state.states])

  return (
    <motion.div
      className={`${styles.card} ${className ?? ''}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      role="status"
      aria-live="polite"
    >
      <div className={styles.steps}>
        <div className={styles.thread} style={{ ['--fill' as any]: fillFraction }} />

        {STEPS.map((s, i) => {
          const st = state.states[i]
          const labelClass =
            st === 'active' ? styles.labelActive :
            st === 'done'   ? styles.labelDone   :
            st === 'error'  ? styles.labelError  : ''

          return (
            <div key={s.key} className={styles.step}>
              <div
                className={
                  st === 'active' ? `${styles.indicator} ${styles.indicatorActive}` :
                  st === 'done'   ? `${styles.indicator} ${styles.indicatorDone}`   :
                  st === 'error'  ? `${styles.indicator} ${styles.indicatorError}`  :
                                    `${styles.indicator} ${styles.indicatorPending}`
                }
                aria-label={`${s.title} ${st}`}
              >
                {st === 'done' && <CheckIcon />}
                {st === 'error' && <CrossIcon />}
                {st === 'pending' && <span aria-hidden style={{ fontSize: 12 }}>{s.emoji}</span>}
                {st === 'active' && (
                  <>
                    <span aria-hidden style={{ fontSize: 12 }}>{s.emoji}</span>
                    <span className={styles.activeOrbit} aria-hidden>
                      <span /><span /><span />
                    </span>
                  </>
                )}
              </div>

              <div className={`${styles.label} ${labelClass}`}>
                <span className={styles.labelText}>{s.title}</span>
                {s.hint && <span className={styles.subLabel}>{s.hint}</span>}
              </div>

              <span className={styles.timeChip}>
                {state.durations[i] !== null ? fmtMs(state.durations[i]) : ''}
              </span>
            </div>
          )
        })}
      </div>

      {state.partial && state.partial.length > 0 && (
        <div className={styles.partialPreview}>
          <div className={styles.partialPreviewTitle}>Live preview</div>
          {state.partial.slice(0, 3).map((row, i) => (
            <div key={i} className={styles.partialRow}>
              <span>{row?.chain ?? '—'} {row?.branch ? `· ${row.branch}` : ''}</span>
              <span className={styles.price}>
                {row?.salePrice ?? row?.price ?? ''}
                {(row?.salePrice ?? row?.price) ? ' ₪' : ''}
              </span>
            </div>
          ))}
        </div>
      )}

      {state.error && (
        <div className={styles.errorBox} role="alert">
          {state.error.message} <span style={{ opacity: 0.6 }}>({state.error.code})</span>
        </div>
      )}

      <div className={styles.footer}>
        <span className={styles.totalElapsed}>Total: {fmtMs(state.totalDurationMs)}</span>
      </div>
    </motion.div>
  )
}

function CheckIcon() {
  return (
    <motion.svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <motion.path
        d="M5 12.5l4 4 10-10"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      />
    </motion.svg>
  )
}

function CrossIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
