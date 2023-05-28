'use client'

import { useState } from 'react'
import { signOut } from "next-auth/react"
import { Avatar, Menu, MenuItem, Button, Divider } from '@mui/material'

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
                <MenuItem sx={{display: "flex", justifyContent: "center"}} disabled>
                    {userName}
                </MenuItem>
                <Divider />
                <MenuItem sx={{display: "flex", justifyContent: "center"}} onClick={handleClose}>
                    Profile
                </MenuItem>
                <MenuItem sx={{display: "flex", justifyContent: "center"}} onClick={handleClose}>
                    My notes
                </MenuItem>
                <MenuItem sx={{display: "flex", justifyContent: "center"}} onClick={logout}>
                    Logout
                </MenuItem>
            </Menu>   
        </>
    )
}
