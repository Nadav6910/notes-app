'use client'

import { useState } from 'react'
import { signOut } from "next-auth/react"
import { Avatar, Menu, MenuItem, Button, Divider } from '@mui/material'
import { CgProfile } from 'react-icons/cg'
import { CgNotes } from 'react-icons/cg'
import { CgLogOut } from 'react-icons/cg'

export default function NavbarAuthBtnsSection({userName}: NavbarBtnsSection) {

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
                <MenuItem 
                    sx={{display: "flex", flexDirection: "column", justifyContent: "center"}} 
                    disabled
                >
                    <p style={{fontSize: "0.7em"}}>Logged in as:</p>
                    <p>{userName}</p>
                </MenuItem>
                <Divider />
                <MenuItem 
                    sx={{display: "flex", justifyContent: "center", gap: "0.4em"}} 
                    onClick={handleClose}
                >
                    <CgProfile />
                    Profile
                </MenuItem>
                <MenuItem 
                    sx={{display: "flex", justifyContent: "center", gap: "0.4em"}} 
                    onClick={handleClose}
                >
                    <CgNotes />
                    My notes
                </MenuItem>
                <Divider />
                <MenuItem 
                    sx={{display: "flex", justifyContent: "center", gap: "0.4em", color: "#EB5406"}} 
                    onClick={logout}
                >
                    <CgLogOut />
                    Logout
                </MenuItem>
            </Menu>   
        </>
    )
}
