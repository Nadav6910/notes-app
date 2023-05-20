import styles from '../../app/styles/mainlayoutstyles.module.css'

export default function AppFooter() {

  return (
    <footer className={styles.footerContainer}>
        <hr />
        <p className={styles.copyrightText}>© 2023 Notes App®. All rights reserved</p>
    </footer>
  )
}
