export const formatDate = (dateString: Date | undefined) => {

    if (dateString) {
        const day = String(dateString.getDate()).padStart(2, '0')
        const month = String(dateString.getMonth() + 1).padStart(2, '0')
        const year = dateString.getFullYear()
        
        const hours = String(dateString.getHours()).padStart(2, '0')
        const minutes = String(dateString.getMinutes()).padStart(2, '0')
        
        return `${day}/${month}/${year} - ${hours}:${minutes}`
    }
}

export const calculateAveragePrices = (prices: any) => {
    
    let sum = 0
    
    for (let i = 0; i < prices.length; i++) {
        sum += parseFloat(prices[i].price)
    }

    return (sum / prices.length).toFixed(2)
}