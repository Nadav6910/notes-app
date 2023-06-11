import styles from "../../app/my-notes/styles/myNotes.module.css"
import Link from 'next/link'
import { FaPlus } from 'react-icons/fa'
import MotionWrap from '../../wrappers/MotionWrap'

export default function AddNotesBtn() {

    return (
      
    <MotionWrap
        style={{width: "4.5em", height: "4.5em", borderRadius: "50%", marginTop: "2em", marginBottom: "2em"}}
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
