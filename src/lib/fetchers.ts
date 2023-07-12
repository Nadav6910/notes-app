import { prisma } from '@/prisma'

export const getNotes = async (userId: string | undefined) => {

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
}

export const getNoteEntries = async (noteId: string | undefined) => {
    
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
}

export const getUserDetails = async (userId: string) => {
        
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
}