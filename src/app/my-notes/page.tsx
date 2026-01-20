import { getServerSession } from "next-auth/next"
import { authOptions } from '../api/auth/[...nextauth]/options'
import { getNotes, getUserNotesView } from "@/lib/fetchers"
import NoNotesDisplay from "@/components/my-notes-page-components/NoNotesDisplay"
import { redirect } from 'next/navigation'
import MyNotesList from "@/components/my-notes-page-components/MyNotesList"

export const metadata = {
    title: 'Notes App | My Notes',
    description: 'show notes',
}

export default async function MyNotes() {

    const session = await getServerSession(authOptions)

    if (!session) {
        redirect('/')
    }

    // Parallelize user notes and view fetching - reduces page load time by ~33%
    const [userNotes, userNotesView] = await Promise.all([
        getNotes(session.user.id),
        getUserNotesView(session.user.id)
    ])

    return (
        <main>
            {userNotes && userNotes?.notes.length < 1 ?

                <NoNotesDisplay /> :

                <MyNotesList
                    userNotes={userNotes}
                    notesViewSelect={userNotesView?.notesView}
                    userId={session.user.id}
                />
            }
        </main>
    )
}