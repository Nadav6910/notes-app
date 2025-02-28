import styles from "../profile/styles/profilePage.module.css"
import { getServerSession } from "next-auth/next"
import { authOptions } from '../api/auth/[...nextauth]/options'
import { redirect } from 'next/navigation'
import { getUserDetails } from "@/lib/fetchers"
import ProfileAvatar from "@/components/profile-page-components/ProfileAvatar"
import { formatDate } from "@/lib/utils"
import { FaArrowRight } from 'react-icons/fa';
import Link from "next/link"

export const metadata = {
    title: 'Notes App | Profile',
    description: 'User Details',
}

export default async function ProfilePage() {

    const session = await getServerSession(authOptions)
   
    if (!session) {
        redirect('/')
    }

    const userDetails = await getUserDetails(session.user.id)

    return (

        <main className={styles.profilePageContainer}>
            <ProfileAvatar userImage={session.user.image} userId={userDetails?.id} />
            <div className={styles.detailsContainer}>
                <div className={styles.detailsSubContainer}>
                    <p className={styles.detailTitle}>Name:</p>
                    <h4 className={styles.detailData}>
                        {userDetails?.name}
                    </h4>
                </div>

                <div className={styles.detailsSubContainer}>
                    <p className={styles.detailTitle}>Username/Email:</p>
                    <h4 className={styles.detailData}>
                        {userDetails?.userName}
                    </h4>
                </div>

                <div className={styles.detailsSubContainer}>
                    <p className={styles.detailTitle}>Account Created At:</p>
                    <h4 className={styles.detailData}>
                        {formatDate(userDetails?.createdAt)}
                    </h4>
                </div>

                <div className={styles.detailsSubContainer}>
                    <p className={styles.detailTitle}>User Id:</p>
                    <h4 className={styles.detailData}>
                        {userDetails?.id}
                    </h4>
                </div>

                <div className={styles.detailsSubContainer}>
                    <p className={styles.detailTitle}>User Notes Count:</p>
                    <h4 className={styles.detailData}>
                        {userDetails?._count?.notes}
                    </h4>
                </div>

                <Link className={styles.goToMyNotesBtn} href="/my-notes">
                    Go to my notes
                    <FaArrowRight />
                </Link>

            </div>
        </main>
    )
}