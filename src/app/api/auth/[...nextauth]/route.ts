import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
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
                // console.log(userData);
                // if no user
                if (!userData) {
                    throw new Error('wrong user name')
                }

                // check password
                if (userData.password !== password) {
                    throw new Error('wrong password')
                }

                const user = { id: userData.id, name: userData.name, userName: userData.userName }
                // throw new Error('wrong data')
                // if (user) {
                //     // Any object returned will be saved in `user` property of the JWT
                return user
                // } 
                
                // else {
                //     // If you return null then an error will be displayed advising the user to check their details.
                //     return null
                //     // You can also Reject this callback with an Error thus the user will be sent to the error page with the error message as a query parameter
                // }
            }
          })
      ],
      pages: {
        signIn: '/login'
      }
})

export { handler as GET, handler as POST }