import { getServerSession } from 'next-auth/next'
import { authOptions } from '../api/auth/[...nextauth]/options'
import { getNotes } from '@/lib/fetchers'
import NotesSidebar from '@/components/note-page-components/NotesSidebar'
import sidebarStyles from '@/components/note-page-components/NotesSidebar.module.css'

export default async function MyNotesLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions)
    const userNotes = session?.user?.id ? await getNotes(session.user.id) : null

    const items = (userNotes?.notes ?? []).map(n => ({
        noteId: n.noteId,
        noteName: n.noteName,
        noteType: n.noteType,
        createdAt: n.createdAt,
    }))

    return (
        <div className={sidebarStyles.layout}>
            <NotesSidebar notes={items} />
            <div className={sidebarStyles.main}>{children}</div>
        </div>
    )
}
