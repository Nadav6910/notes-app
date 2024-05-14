import { NextResponse } from 'next/server';
import { prisma } from '@/prisma'
 
export async function POST(request: Request) {

    // get body data
    const { profileImage, userId } = await request.json()

    if (!profileImage || !userId) return NextResponse.error()

    try {
        
       // update user profile image
        await prisma.user.update({
            where: {
                id: userId
            },
            data: {
                profileImage: profileImage
            }
        })

        return NextResponse.json({massage: "updated profile image"})
    } 
    
    catch (error: any) {
        console.log(error)
        return NextResponse.json({error: error.message})
    }
}