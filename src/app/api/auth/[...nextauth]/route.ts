import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import type { NextAuthOptions } from 'next-auth'
// import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from '@/prisma'

// const fetchUsers = async () => {
//     const users = await prisma.user.findMany()
//     console.log(users);
// }

// fetchUsers()

//  await prisma.user.create({
//     data: {
//       name: 'Rich',
//       userName: 'hello@prisma.com',
//       password: "12345678"
//     }
//   })

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            type: "credentials",
            credentials: {
              userName: { label: "Username", type: "text" },
              password: { label: "Password", type: "password" }
            },
            async authorize(credentials, req) {
                
                const { userName, password } = credentials as {
                    userName: string
                    password: string
                }
                
                // Check if user exists
                const userData = await prisma.user.findUnique({where: {userName: userName}})
                
                // if no user
                if (!userData) {
                    throw new Error('wrong user name')
                }

                // check password
                if (userData.password !== password) {
                    throw new Error('wrong password')
                }

                const user = { id: userData.id, name: userData.name }
            
                return user
            }
          })
      ],
      pages: {
        signIn: '/login'
      }
  }
  

const handler = NextAuth({

    // adapter: PrismaAdapter(prisma),
    providers: [
        CredentialsProvider({
            type: "credentials",
            credentials: {
              userName: { label: "Username", type: "text" },
              password: { label: "Password", type: "password" }
            },
            async authorize(credentials, req) {
                
                const { userName, password } = credentials as {
                    userName: string
                    password: string
                }
                
                // Check if user exists
                const userData = await prisma.user.findUnique({where: {userName: userName}})
                
                // if no user
                if (!userData) {
                    throw new Error('wrong user name')
                }

                // check password
                if (userData.password !== password) {
                    throw new Error('wrong password')
                }

                const user = { id: userData.id, name: userData.name }
            
                return user
            }
          })
      ],
      pages: {
        signIn: '/login'
      }
})

export { handler as GET, handler as POST }