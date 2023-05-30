import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import type { NextAuthOptions } from 'next-auth'
// import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from '@/prisma'
import bcrypt from 'bcrypt'

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

                try {
                  
                    // Check if user exists
                    const userData = await prisma.user.findUnique({where: {userName: userName}})
                    
                    // if no user
                    if (!userData) {
                        throw new Error('wrong user name')
                    }

                    // check password
                    const match = await bcrypt.compare(password, userData.password)

                    if (!match) {
                        throw new Error('wrong password')
                    }

                    const user = { id: userData.id, name: userData.name }
                
                    return user  
                } 
                
                catch (error: any) {
                    console.log(error)
                    throw new Error(error.message)
                }
                
            }
        }),
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID as string,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET as string
        })
      ],
      callbacks: {
        async signIn({account, user}: {account: any, user: any}) {

          if (account.provider === "google") {
            
            try {
              // Check if user exists
              const userData = await prisma.user.findUnique({where: {userName: user?.email}})
              
              if (userData) {
                return user
              }

              // create user
              await prisma.user.create({
                data: {
                    name: user?.name,
                    userName: user?.email,
                    password: "google-account"
                }
              })

              return user
            } 
            
            catch (error) {
              console.log(error)
            }
          }

          return true
        }
      },
      pages: {
        signIn: '/login'
      }
  }

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }