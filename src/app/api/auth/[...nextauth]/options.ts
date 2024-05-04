import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import GitHubProvider from "next-auth/providers/github"
import type { NextAuthOptions, User } from 'next-auth'
// import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from '@/prisma'
import bcrypt from 'bcrypt'

export const authOptions: NextAuthOptions = {
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
                  const user = {
                    id: userData.id,
                    name: userData.name,
                  }
              
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
      }),
      GitHubProvider({
        clientId: process.env.GITHUB_ID as string,
        clientSecret: process.env.GITHUB_SECRET as string
      })
    ],
    callbacks: {
      signIn: async ({account, user}: any) => {

        if (account.provider === "google" || account.provider === "github") {
          
          try {
            // Check if user exists
            const userData = await prisma.user.findUnique({where: {userName: user?.email}}) as User
            
            if (userData) {
        
              user.id = userData.id
              return user
            }

            // create user
            const newUser = await prisma.user.create({
              data: {
                  name: user?.name,
                  userName: user?.email,
                  password: "social-account"
              }
            })

            user.id = newUser.id

            return user
          }
          
          catch (error) {
            console.log(error)
          }
        }

        return true
      },
      jwt: async ({token, user}: any) => {
        if (user && token) {    
          token.sub = user.id
        }

        return token
      },
      session: async ({session, token}: any) => {
        
        if (session.user && token.sub) {
          session.user.id = token.sub 
        }

        return session
      }
    },
    session: {
      strategy: "jwt",
      maxAge: 30 * 24 * 60 * 60,
      updateAge: 24 * 60 * 60
    }
}