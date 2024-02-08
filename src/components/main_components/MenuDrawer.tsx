'use client'

import styles from "../../app/styles/mainlayoutstyles.module.css"
import { useState } from 'react'
import { useTheme } from 'next-themes'
import { 
    Drawer, 
    IconButton, 
    Box, 
    List, 
    ListItem, 
    ListItemIcon,
    ListItemButton,
    ListItemText,
    Divider,
    Avatar
} from '@mui/material'
import { useRouter } from "next/navigation"
import ThemeSwitch from "./ThemeSwitch"
import { CgProfile } from 'react-icons/cg'
import { CgNotes } from 'react-icons/cg'
import { CgLogOut } from 'react-icons/cg'
import { CgLogIn } from 'react-icons/cg'
import { GiArchiveRegister } from 'react-icons/gi'
import { HiOutlineMenuAlt3 } from 'react-icons/hi'
import { signOut } from "next-auth/react"
import { NavbarDrawer } from "../../../types"


export default function MenuDrawer({isSession, userName, userImage}: NavbarDrawer) {

    const theme = useTheme()
    const router = useRouter()
    
    const [state, setState] = useState({
        right: false,
    })

    const toggleDrawer =
        (open: boolean) =>
        (event: React.KeyboardEvent | React.MouseEvent) => {
        if (
            event.type === 'keydown' &&
            ((event as React.KeyboardEvent).key === 'Tab' ||
            (event as React.KeyboardEvent).key === 'Shift')
        ) {
            return
        }

        setState({ ...state, "right": open });
    }

    const list = () => (
        <Box
        role="presentation"
        onClick={toggleDrawer(false)}
        onKeyDown={toggleDrawer(false)}
        >
        {isSession ?

        <>
            <List>
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between" 
                }}>
                    <ThemeSwitch />

                    <div style={{
                    display: "flex", 
                    flexDirection: "column", 
                    alignItems: "flex-end",
                    paddingRight: "1em", 
                    paddingTop: "0.5em", 
                    gap: "0.5em"
                }}>
                        <Avatar src={userImage ? userImage : ""} sx={{backgroundColor: "#9e9797"}} />
                        <p style={
                            {
                                marginBottom: "1em", 
                                textAlign: "end",
                                fontSize: "0.9rem !important"
                            }
                        }
                        >
                            {userName}
                        </p>
                    </div>
                </div>
                <Divider sx={{marginBottom: "0.55em"}} />
                <ListItem disablePadding>
                    <ListItemButton sx={{gap: "1em"}} onClick={() => router.push('/profile')}>
                        <ListItemIcon sx={{display: "contents"}}>
                            <CgProfile style={{color: theme.theme === "dark" ? "white" : "black"}} />
                        </ListItemIcon>
                        <ListItemText primary={"Profile"} />
                    </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                    <ListItemButton sx={{gap: "1em"}} onClick={() => router.push('/my-notes')}>
                        <ListItemIcon sx={{display: "contents"}}>
                            <CgNotes style={{color: theme.theme === "dark" ? "white" : "black"}} />
                        </ListItemIcon>
                        <ListItemText primary={"My Notes"} />
                    </ListItemButton>
                </ListItem>
            </List>
            <Divider />
            <List>
                <ListItem disablePadding>
                    <ListItemButton sx={{gap: "1em"}} onClick={() => signOut()}>
                        <ListItemIcon sx={{color: "#EB5406", display: "contents"}}>
                            <CgLogOut />
                        </ListItemIcon>
                        <ListItemText sx={{color: "#EB5406"}} primary={"Logout"} />
                    </ListItemButton>
                </ListItem>
            </List>
        </> :

        <List>
            <p style={{paddingTop: "0.5em", paddingLeft: "1.3em", marginBottom: "1em", fontWeight: "bolder"}}>
                Hello guest ,
            </p>
            <Divider />
            <ListItem disablePadding>
                <ListItemButton sx={{gap: "1em"}} onClick={() => router.push('/login')}>
                    <ListItemIcon sx={{display: "contents"}}>
                        <CgLogIn style={{color: theme.theme === "dark" ? "white" : "black"}} />
                    </ListItemIcon>
                    <ListItemText primary={"Login"} />
                </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
                <ListItemButton sx={{gap: "1em"}} onClick={() => router.push('/register')}>
                    <ListItemIcon sx={{display: "contents"}}>
                        <GiArchiveRegister style={{color: theme.theme === "dark" ? "white" : "black"}} />
                    </ListItemIcon>
                    <ListItemText primary={"Register"} />
                </ListItemButton>
            </ListItem>
        </List>
        }
        </Box>
    )

    return (
        <>
            <IconButton onClick={toggleDrawer(true)}>
                <HiOutlineMenuAlt3 className={styles.menuIcon} />
            </IconButton>
            <Drawer
                PaperProps={{className: styles.menuDrawer}}
                anchor={"right"}
                open={state["right"]}
                onClose={toggleDrawer(false)}
            >
                {list()}
            </Drawer>
        </>    
    )
}
// backgroundColor: theme.theme === "dark" ? "#353535" : "white",
// color: theme.theme === "dark" ? "white" : "black",
// width: "11em"