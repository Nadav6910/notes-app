'use client'

import { Avatar } from '@mui/material'

export default function ProfileAvatar({userImage}: {userImage: string | undefined}) {

  return (

    <Avatar 
      src={userImage ? userImage : ""} 
      sx={{backgroundColor: "#9e9797", width: "3.2em", height: "3.2em"}} 
    />
  )
}
