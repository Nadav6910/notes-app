import { prisma } from '@/prisma'

export const getNotes = async (userId: string | undefined) => {

    return await prisma.user.findUnique({
        where: {
            id: userId
        },
        select: {
            notes: true
        }
    })
}