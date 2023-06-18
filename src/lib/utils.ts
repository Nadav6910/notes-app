export const formatDate = (dateString: Date) => {
        
    const day = String(dateString.getDate()).padStart(2, '0')
    const month = String(dateString.getMonth() + 1).padStart(2, '0')
    const year = dateString.getFullYear()
    
    const hours = String(dateString.getHours()).padStart(2, '0')
    const minutes = String(dateString.getMinutes()).padStart(2, '0')
    
    return `${day}/${month}/${year} - ${hours}:${minutes}`
}