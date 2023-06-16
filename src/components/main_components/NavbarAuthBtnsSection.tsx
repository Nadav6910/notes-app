'use client'

import styles from "../../app/styles/mainlayoutstyles.module.css"
import { useState } from 'react'
import { signOut } from "next-auth/react"
import { Avatar, Menu, MenuItem, Button, Divider } from '@mui/material'
import { CgProfile } from 'react-icons/cg'
import { CgNotes } from 'react-icons/cg'
import { CgLogOut } from 'react-icons/cg'
import MotionWrap from "../../wrappers/MotionWrap"
import { useRouter } from 'next/navigation'
import { NavbarBtnsSection } from "../../../types"

export default function NavbarAuthBtnsSection({userName, userImage}: NavbarBtnsSection) {

    const router = useRouter()

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
    
    const open = Boolean(anchorEl)

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget)
    }
    const handleClose = () => {
        setAnchorEl(null)
    }

    const logout = () => {

        handleClose()
        router.push('/')
        signOut()
    }

    return (
        <>
            <MotionWrap 
                style={{width: "fit-content", height: "fit-content", borderRadius: "50%"}}
                whileHover={{scale: 1.1}}
                whileTap={{ scale: 0.9 }} 
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
                <Button
                    id="basic-button"
                    aria-controls={open ? 'basic-menu' : undefined}
                    aria-haspopup="true"
                    aria-expanded={open ? 'true' : undefined}
                    onClick={handleClick}
                    disableFocusRipple
                    disableRipple
                    disableTouchRipple
                    sx={{borderRadius: "50%", padding: 0}}
                >
                    <Avatar src={userImage ? userImage : ""} sx={{backgroundColor: "#9e9797"}} />
                </Button>
                <Menu
                    id="basic-menu"
                    style={{padding: "5em !important"}}
                    anchorEl={anchorEl}
                    open={open}
                    onClose={handleClose}
                    MenuListProps={{
                    'aria-labelledby': 'basic-button',
                    }}
                    PaperProps={{className: styles.AccountMenuContainer}}
                >   
                    <MenuItem 
                        sx={{display: "flex", flexDirection: "column", justifyContent: "flex-start"}} 
                        disabled
                    >
                        <p className={styles.loggedInAs}>Logged in as:</p>
                        <p className={styles.loggedUserName}>{userName}</p>
                    </MenuItem>
                    <Divider sx={{marginTop: "0 !important"}} />
                    <MenuItem 
                        className={styles.menuItem}
                        onClick={() => {router.push('/profile'); handleClose()}}
                    >
                        <CgProfile />
                        Profile
                    </MenuItem>
                    <MenuItem 
                        className={styles.menuItem}
                        onClick={() => {router.push('/my-notes'); handleClose()}}
                    >
                        <CgNotes />
                        My notes
                    </MenuItem>
                    <Divider />
                    <MenuItem 
                        sx={{display: "flex", justifyContent: "flex-start", gap: "0.4em", color: "#EB5406", fontWeight: 100}} 
                        onClick={logout}
                    >
                        <CgLogOut />
                        Logout
                    </MenuItem>
                </Menu>   
            </MotionWrap>
        </>
    )
}
