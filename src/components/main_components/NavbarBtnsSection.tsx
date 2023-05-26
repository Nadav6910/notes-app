'use client'

import styles from '../../app/styles/mainlayoutstyles.module.css'
import { useState } from 'react'
import { useSession, signOut } from "next-auth/react"
import Link from 'next/link'
import { Avatar, Menu, MenuItem, Button, Divider } from '@mui/material'
import MotionWrap from '../../wrappers/MotionWrap'

export default function NavbarBtnsSection() {

    const { status, data } = useSession()
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
        signOut()
    }

    if (status === "loading") {
        return null
    }

    if (status === "authenticated") {

        return (
            <>
                <Button
                    id="basic-button"
                    aria-controls={open ? 'basic-menu' : undefined}
                    aria-haspopup="true"
                    aria-expanded={open ? 'true' : undefined}
                    onClick={handleClick}
                    disableFocusRipple
                    disableRipple
                    disableTouchRipple
                    sx={{borderRadius: "50%"}}
                >
                    <Avatar sx={{backgroundColor: "#9e9797"}} />
                </Button>
                <Menu
                    id="basic-menu"
                    sx={{width: "25em !important"}}
                    anchorEl={anchorEl}
                    open={open}
                    onClose={handleClose}
                    MenuListProps={{
                    'aria-labelledby': 'basic-button',
                    }}
                >   
                    <MenuItem disabled>{data.user?.name}</MenuItem>
                    <Divider />
                    <MenuItem onClick={handleClose}>Profile</MenuItem>
                    <MenuItem onClick={handleClose}>My notes</MenuItem>
                    <MenuItem onClick={logout}>Logout</MenuItem>
                </Menu>   
            </>
        )
    }

    return (
        <>
            <MotionWrap 
            whileHover={{scale: 1.1}}
            whileTap={{ scale: 0.9 }} 
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
                <Link href={'/login'} className={styles.loginLink}>Log In</Link>
            </MotionWrap>
            
            <MotionWrap 
            whileHover={{scale: 1.1}}
            whileTap={{ scale: 0.9 }} 
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
                <Link href={'/register'} className={styles.registerLink}>Register</Link>
            </MotionWrap>    
        </>
    )
}
