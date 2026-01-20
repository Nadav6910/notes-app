import { cache } from 'react'
import { prisma } from '@/prisma'

// React.cache() deduplicates identical requests during a single server render
// This prevents duplicate database queries when multiple components fetch the same data
export const getNotes = cache(async (userId: string | undefined) => {

    return await prisma.user.findUnique({
        where: {
            id: userId
        },
        select: {
            notes: {
                orderBy: {
                    createdAt: 'desc'
                },
                select: {
                    noteId: true,
                    noteName: true,
                    noteType: true,
                    createdAt: true,
                    _count: {
                        select: {
                            entries: true
                        }
                    }
                }
            }
        }
    })
})

export const getUserNotesView = cache(async (userId: string | undefined) => {

    return await prisma.user.findUnique({
        where: {
            id: userId
        },
        select: {
            notesView: true
        }
    })
})

export const getNoteEntries = cache(async (noteId: string | undefined) => {

    return await prisma.note.findUnique({
        where: {
            noteId: noteId
        },
        select: {
            noteName: true,
            noteType: true,
            noteView: true,
            entries: {
                orderBy: {
                    createdAt: 'desc'
                }
            }
        }
    })
})

export const getUserDetails = cache(async (userId: string) => {

    return await prisma.user.findUnique({
        where: {
            id: userId
        },
        select: {
            id: true,
            userName: true,
            name: true,
            createdAt: true,
            _count: {
                select: {
                    notes: true,
                }
            }
        }
    })
})