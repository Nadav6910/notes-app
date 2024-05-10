import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { calculateAveragePrices } from '@/lib/utils';
 
export async function POST(request: Request) {

    // get body data
    const { itemName } = await request.json()
    console.log(itemName);
    try {
        // Launch the browser and open a new blank page
        const browser = await puppeteer.launch()
        const page = await browser.newPage()

        // Navigate the page to a URL
        await page.goto(`https://www.shufersal.co.il/online/he/search?text=${itemName}`, {waitUntil: 'networkidle0'})

        // scroll to the bottom of the page
        // const previousHeight = await page.evaluate('document.body.scrollHeight')
        // await page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
        // await page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`)

        // Locate the full title with a unique string
        const data = await page.waitForFunction(() => {
            const items = Array.from(document.querySelectorAll('.SEARCH')) // Select elements with class 'item'
            return items
        })

        const prices = await data.evaluate(el => el.map(item => (
            {
                name: item.getAttribute('data-product-name')?.split("").reverse().join(""),
                price: item.getAttribute('data-product-price')
            }
        )))

        
        console.log(prices);
        console.log(calculateAveragePrices(prices))
        
        // close the browser
        await browser.close()
        
        // send the data back to the client
        return NextResponse.json({message: "Scraped data successfully"}, {status: 200})
    } 
    
    catch (error: any) {
        console.log(error)
        return NextResponse.json({error: error.message}, {status: 500})
    }
}