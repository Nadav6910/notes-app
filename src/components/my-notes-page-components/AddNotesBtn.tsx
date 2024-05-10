import styles from "../../app/my-notes/styles/myNotes.module.css"
import Link from 'next/link'
import { FaPlus } from 'react-icons/fa'
import MotionWrap from '../../wrappers/MotionWrap'

export default function AddNotesBtn() {

    return (
      
    <MotionWrap
        style={{borderRadius: "50%"}}
        whileHover={{boxShadow: "inset 0 0 0 200px rgba(255,255,255,0.1)"}}
        transition={{ 
            type: "just" 
        }}
    >
        <Link className={styles.addNotesLinkWithNotes} href={'/my-notes/create'}>
            <FaPlus />
        </Link>
    </MotionWrap>
  )
}
