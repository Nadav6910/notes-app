'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MdChecklist, MdNoteAlt, MdAdd, MdViewSidebar, MdHistory, MdAllInbox } from 'react-icons/md'
import styles from './NotesSidebar.module.css'

const COLLAPSED_KEY = 'notes-sidebar-collapsed'

export interface NotesSidebarNote {
  noteId: string
  noteName: string
  noteType: string
  createdAt: string | Date
}

interface Props {
  notes: NotesSidebarNote[]
}

export default function NotesSidebar({ notes }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = window.localStorage.getItem(COLLAPSED_KEY)
      if (saved === '1') setCollapsed(true)
    } catch {}
    setHydrated(true)
  }, [])

  const toggle = () => {
    setCollapsed(c => {
      const next = !c
      try { window.localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0') } catch {}
      return next
    })
  }

  const recent = useMemo(() => notes.slice(0, 5), [notes])

  const counts = useMemo(() => ({
    total: notes.length,
    list: notes.filter(n => n.noteType === 'Items list').length,
    notebook: notes.filter(n => n.noteType === 'Notebook').length,
  }), [notes])

  const isMyNotesActive = pathname === '/my-notes'
  const isNoteActive = (noteId: string) => pathname?.startsWith(`/my-notes/note/${noteId}`)

  return (
    <aside
      className={`${styles.sidebar} ${collapsed && hydrated ? styles.collapsed : ''}`}
      aria-label="Notes navigation"
    >
      <div className={styles.header}>
        <span className={styles.workspaceLabel}>Workspace</span>
        <button
          className={styles.collapseBtn}
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <MdViewSidebar size={16} />
        </button>
      </div>

      <ul className={styles.itemList}>
        <li>
          <Link
            href="/my-notes"
            className={`${styles.item} ${isMyNotesActive ? styles.itemActive : ''}`}
            title="All notes"
          >
            <span className={styles.itemIcon}><MdAllInbox /></span>
            <span className={styles.label}>All notes</span>
            <span className={styles.badge}>{counts.total}</span>
          </Link>
        </li>
      </ul>

      <div className={styles.sectionTitle}>By type</div>
      <ul className={styles.itemList}>
        <li>
          <span className={styles.item} title="Items list">
            <span className={styles.itemIcon}><MdChecklist /></span>
            <span className={styles.label}>Items lists</span>
            <span className={styles.badge}>{counts.list}</span>
          </span>
        </li>
        <li>
          <span className={styles.item} title="Notebook">
            <span className={styles.itemIcon}><MdNoteAlt /></span>
            <span className={styles.label}>Notebooks</span>
            <span className={styles.badge}>{counts.notebook}</span>
          </span>
        </li>
      </ul>

      {recent.length > 0 && (
        <>
          <div className={styles.sectionTitle}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <MdHistory size={12} /> Recent
            </span>
          </div>
          <ul className={`${styles.itemList} ${styles.recent}`}>
            {recent.map(n => (
              <li key={n.noteId}>
                <Link
                  href={`/my-notes/note/${n.noteId}`}
                  className={`${styles.item} ${isNoteActive(n.noteId) ? styles.itemActive : ''}`}
                  title={n.noteName}
                >
                  <span className={styles.itemIcon}>
                    {n.noteType === 'Items list' ? <MdChecklist /> : <MdNoteAlt />}
                  </span>
                  <span className={styles.label}>{n.noteName}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className={styles.footer}>
        <Link href="/my-notes/create" className={styles.footerCta} title="New note">
          <MdAdd size={18} />
          <span>New note</span>
        </Link>
      </div>
    </aside>
  )
}
