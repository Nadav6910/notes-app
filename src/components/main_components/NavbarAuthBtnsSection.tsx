'use client'

import { useState } from 'react'
import { signOut } from "next-auth/react"
import { Avatar, Menu, MenuItem, Button, Divider } from '@mui/material'
import { CgProfile } from 'react-icons/cg'
import { CgNotes } from 'react-icons/cg'
import { CgLogOut } from 'react-icons/cg'
import { useRouter } from 'next/navigation'

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
        signOut()
    }

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
                <Avatar src={userImage ? userImage : ""} sx={{backgroundColor: "#9e9797"}} />
            </Button>
            <Menu
                id="basic-menu"
                className='asdasdasd'
                style={{padding: "5em !important"}}
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                MenuListProps={{
                'aria-labelledby': 'basic-button',
                }}
            >   
                <MenuItem 
                    sx={{display: "flex", flexDirection: "column", justifyContent: "flex-start"}} 
                    disabled
                >
                    <p style={{fontSize: "0.7em"}}>Logged in as:</p>
                    <p>{userName}</p>
                </MenuItem>
                <Divider sx={{marginTop: "0 !important"}} />
                <MenuItem 
                    sx={{display: "flex", justifyContent: "flex-start", gap: "0.4em", fontWeight: 100}} 
                    onClick={() => router.push('/profile')}
                >
                    <CgProfile />
                    Profile
                </MenuItem>
                <MenuItem 
                    sx={{display: "flex", justifyContent: "flex-start", gap: "0.4em", fontWeight: 100}} 
                    onClick={() => router.push('/my-notes')}
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
        </>
    )
}