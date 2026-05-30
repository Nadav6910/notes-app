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
            // Upsert avoids a read-then-create race when two sign-ins arrive at once
            const dbUser = await prisma.user.upsert({
              where: {userName: user?.email},
              update: {},
              create: {
                name: user?.name,
                userName: user?.email,
                password: "social-account",
                notesView: "card",
                profileImage: user?.image
              }
            })

            user.id = dbUser.id

            if (dbUser.profileImage) {
              user.image = dbUser.profileImage
            }
            // existing user without a stored image: backfill from the provider
            else if (user?.image) {
              await prisma.user.update({
                where: {id: dbUser.id},
                data: {profileImage: user.image}
              })
            }

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
          // fetch only the field we need (avoids loading the full user row)
          const userData = await prisma.user.findUnique({
            where: {id: token.sub},
            select: {profileImage: true}
          })
          session.user.id = token.sub

          if (userData) {
            session.user.image = userData.profileImage
          }
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