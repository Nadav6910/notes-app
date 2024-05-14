'use client'

import styles from "../../app/profile/styles/profilePage.module.css"
import { useState } from "react";
import { Avatar, Snackbar, Alert } from '@mui/material'
import { FaCamera } from "react-icons/fa";
import { useRouter } from "next/navigation";

export default function ProfileAvatar({userImage, userId}: {userImage: string | undefined, userId: string | undefined}) {

  const router = useRouter()

  const [profileImage, setProfileImage] = useState(userImage)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [imageTypeError, setImageTypeError] = useState(false)
  const [imageSizeError, setImageSizeError] = useState(false)
  const [uploadError, setUploadError] = useState(false)

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {

    const imageFile = event.target.files?.[0]
    const maxSize = 5242880 // 5MB

    if (!imageFile) return
    
    // prevent files that are not jpeg or png
    if (imageFile.type !== "image/jpeg" && imageFile.type !== "image/png" && imageFile.type !== "image/svg+xml") {
      setImageTypeError(true)
      setTimeout(() => setImageTypeError(false), 3000)
      event.target.files = null
      return
    }

    // prevent files that are larger than 3MB
    if (imageFile.size > maxSize) {
      setImageSizeError(true)
      setTimeout(() => setImageSizeError(false), 3000)
      event.target.files = null
      return
    }

    try {
      // generate data url from compressed file
      const reader = new FileReader()
      reader.readAsDataURL(imageFile)
      reader.onloadend = () => {

        // Create an image object
        const originalImage = new Image()
        originalImage.src = reader.result as string

        originalImage.onload = async () => {
          // Set the dimensions of the image
          const maxWidth = 300
          const maxHeight = 300
          let {width, height} = originalImage

          // Calculate the width and height, maintaining aspect ratio
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width)
              width = maxWidth
            }
          } 
          
          else if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }

          // Create a canvas object
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height

          // Draw the image on the canvas
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(originalImage, 0, 0, width, height)

          // Get the data URL of the compressed image
          const compressedImageStr = canvas.toDataURL('image/jpeg', 0.4)
          
          setProfileImage(compressedImageStr)

          // logic to upload the compressed image to server
          const response = await fetch("/api/upload-profile-image", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({profileImage: compressedImageStr, userId})
          })

          if (response.ok) {
            router.refresh()
            setShowSuccessMessage(true)
            setTimeout(() => setShowSuccessMessage(false), 3000)

          } 
          
          else {
            setUploadError(true)
            setTimeout(() => setUploadError(false), 3000)
          }
        }
      }

      reader.onerror = () => {
        setUploadError(true)
        setTimeout(() => setUploadError(false), 3000)
      }
    } 
    
    catch (error) {
      console.log(error)
    }
  }

  return (
    <>
      <div className={styles.profileAvatarContainer}>
        <Avatar 
          src={profileImage ? profileImage : ""} 
          sx={{backgroundColor: "#9e9797", width: "4.5em", height: "4.5em"}} 
        />
        <div className={styles.selectImageToUploadContainer}>
          <FaCamera style={{width: "0.68em", height: "0.68em", cursor: "pointer"}} />
          <input 
            className={styles.uploadProfileImageInput}
            onChange={handleImageUpload}
            type="file" 
            id="uploadProfileImage" 
            accept="image/*" 
          />
        </div>
      </div>

      {imageTypeError &&
        <Snackbar
          open={imageTypeError}
          autoHideDuration={3000}
          onClose={() => setImageTypeError(false)}
          anchorOrigin={{horizontal: "center", vertical: "bottom"}}
        >
          <Alert onClose={() => setImageTypeError(false)} severity="error" sx={{ width: '100%' }}>
            Please select a valid image file
          </Alert>
        </Snackbar>
      }

      {imageSizeError &&
        <Snackbar
          open={imageSizeError}
          autoHideDuration={3000}
          onClose={() => setImageSizeError(false)}
          anchorOrigin={{horizontal: "center", vertical: "bottom"}}
        >
          <Alert onClose={() => setImageSizeError(false)} severity="error" sx={{ width: '100%' }}>
            Image size should be less than 3MB
          </Alert>
        </Snackbar>
      }

      {uploadError &&
        <Snackbar
          open={uploadError}
          autoHideDuration={3000}
          onClose={() => setUploadError(false)}
          anchorOrigin={{horizontal: "center", vertical: "bottom"}}
        >
          <Alert onClose={() => setUploadError(false)} severity="error" sx={{ width: '100%' }}>
            Error uploading image. Please try again
          </Alert>
        </Snackbar>
      }

      {showSuccessMessage &&
        <Snackbar
          open={showSuccessMessage}
          autoHideDuration={3000}
          onClose={() => setShowSuccessMessage(false)}
          anchorOrigin={{horizontal: "center", vertical: "bottom"}}
        >
          <Alert onClose={() => setShowSuccessMessage(false)} severity="success" sx={{ width: '100%' }}>
            Image uploaded successfully
          </Alert>
        </Snackbar>
      }
    </>
  )
}
