// Browser Pool Service for managing multiple Puppeteer browser instances
import puppeteer, { Browser, Page } from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import fs from 'node:fs'
import path from 'node:path'

export interface BrowserPoolConfig {
  maxBrowsers: number
  maxPagesPerBrowser: number
  browserIdleTimeoutMs: number
  pageIdleTimeoutMs: number
  navigationTimeoutMs: number
  defaultTimeoutMs: number
}

interface PooledBrowser {
  browser: Browser
  activePagesCount: number
  lastUsed: number
  id: string
}

const DEFAULT_CONFIG: BrowserPoolConfig = {
  maxBrowsers: 3,
  maxPagesPerBrowser: 2,
  browserIdleTimeoutMs: 60_000,
  pageIdleTimeoutMs: 30_000,
  navigationTimeoutMs: 15_000,
  defaultTimeoutMs: 8_000
}

// Blocked hosts for request interception
const BLOCKED_HOSTS = [
  'facebook.com', 'staticxx.facebook.com', 'connect.facebook.net',
  'google-analytics.com', 'googletagmanager.com', 'g.doubleclick.net',
  'hotjar.com', 'fullstory.com'
]

// Chrome executable path resolution
const exists = (p: string) => { try { return fs.existsSync(p) } catch { return false } }

async function resolveExecutablePath(): Promise<string> {
  if (process.platform === 'linux') {
    const execPath = await chromium.executablePath()
    if (execPath && exists(execPath)) return execPath
    const fallback = [
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser'
    ].find(exists)
    if (fallback) return fallback
    throw new Error('No Chromium executable on Linux')
  }

  if (process.platform === 'darwin') {
    const mac = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      path.join(process.env.HOME || '', 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
    ].find(exists)
    if (mac) return mac
  }

  if (process.platform === 'win32') {
    const win = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
    ].find(exists)
    if (win) return win
  }

  throw new Error('Could not find a Chrome/Chromium executable on this system')
}

class BrowserPool {
  private pool: PooledBrowser[] = []
  private config: BrowserPoolConfig
  private cleanupTimer: NodeJS.Timeout | null = null
  private pendingRequests: Array<{
    resolve: (value: { page: Page; release: () => Promise<void> }) => void
    reject: (error: Error) => void
  }> = []

  constructor(config: Partial<BrowserPoolConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.startCleanupTimer()
  }

  private startCleanupTimer() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer)
    this.cleanupTimer = setInterval(() => this.cleanup(), 30_000)
  }

  private async cleanup() {
    const now = Date.now()
    const toRemove: PooledBrowser[] = []

    for (const pooled of this.pool) {
      const isIdle = pooled.activePagesCount === 0
      const isExpired = now - pooled.lastUsed > this.config.browserIdleTimeoutMs

      if (isIdle && isExpired) {
        toRemove.push(pooled)
      }
    }

    for (const pooled of toRemove) {
      try {
        await pooled.browser.close()
      } catch {}
      this.pool = this.pool.filter(p => p.id !== pooled.id)
    }
  }

  private async createBrowser(): Promise<PooledBrowser> {
    console.log('[BrowserPool] Creating new browser...')
    console.log('[BrowserPool] Platform:', process.platform)

    let executablePath: string
    try {
      executablePath = await resolveExecutablePath()
      console.log('[BrowserPool] Executable path resolved:', executablePath)
    } catch (pathErr: any) {
      console.error('[BrowserPool] Failed to resolve executable path:', pathErr?.message)
      throw pathErr
    }

    const isLinux = process.platform === 'linux'
    const args = isLinux
      ? [
          ...chromium.args,
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--single-process',
        ]
      : [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ]

    console.log('[BrowserPool] Launching puppeteer with args:', args.length, 'arguments')

    let browser: Browser
    try {
      browser = await puppeteer.launch({
        executablePath,
        headless: true,
        args,
      })
      console.log('[BrowserPool] Browser launched successfully')
    } catch (launchErr: any) {
      console.error('[BrowserPool] Failed to launch browser:', launchErr?.message)
      throw launchErr
    }

    const pooled: PooledBrowser = {
      browser,
      activePagesCount: 0,
      lastUsed: Date.now(),
      id: `browser-${Date.now()}-${Math.random().toString(36).slice(2)}`
    }

    browser.on('disconnected', () => {
      console.log('[BrowserPool] Browser disconnected:', pooled.id)
      this.pool = this.pool.filter(p => p.id !== pooled.id)
    })

    this.pool.push(pooled)
    console.log('[BrowserPool] Browser added to pool. Total browsers:', this.pool.length)
    return pooled
  }

  private async hardenPage(page: Page) {
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    )
    await page.setExtraHTTPHeaders({ 'accept-language': 'he-IL,he;q=0.9,en;q=0.8' })
    await page.setViewport({ width: 1280, height: 900 })

    await page.setRequestInterception(true)
    page.on('request', req => {
      const t = req.resourceType()
      const url = req.url()
      if (t === 'image' || t === 'media') return req.abort()
      if (BLOCKED_HOSTS.some(h => url.includes(h))) return req.abort()
      req.continue()
    })

    page.setDefaultNavigationTimeout(this.config.navigationTimeoutMs)
    page.setDefaultTimeout(this.config.defaultTimeoutMs)
  }

  async acquirePage(): Promise<{ page: Page; release: () => Promise<void> }> {
    console.log('[BrowserPool] acquirePage called. Pool size:', this.pool.length, 'pending:', this.pendingRequests.length)

    // Find available browser with capacity
    let pooled = this.pool.find(p =>
      p.activePagesCount < this.config.maxPagesPerBrowser
    )

    if (pooled) {
      console.log('[BrowserPool] Found available browser:', pooled.id, 'active pages:', pooled.activePagesCount)
    }

    // Create new browser if none available and under limit
    if (!pooled && this.pool.length < this.config.maxBrowsers) {
      console.log('[BrowserPool] No available browser, creating new one...')
      pooled = await this.createBrowser()
    }

    // If still no available browser, wait for one
    if (!pooled) {
      console.log('[BrowserPool] All browsers at capacity, waiting for one to become available...')
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          const idx = this.pendingRequests.findIndex(r => r.resolve === resolve)
          if (idx !== -1) this.pendingRequests.splice(idx, 1)
          console.error('[BrowserPool] Timeout waiting for available browser')
          reject(new Error('Timeout waiting for available browser'))
        }, 30_000)

        this.pendingRequests.push({
          resolve: (value) => {
            clearTimeout(timeout)
            resolve(value)
          },
          reject: (error) => {
            clearTimeout(timeout)
            reject(error)
          }
        })
      })
    }

    pooled.activePagesCount++
    pooled.lastUsed = Date.now()

    console.log('[BrowserPool] Creating new page on browser:', pooled.id)
    let page: Page
    try {
      page = await pooled.browser.newPage()
      console.log('[BrowserPool] Page created successfully')
    } catch (pageErr: any) {
      pooled.activePagesCount--
      console.error('[BrowserPool] Failed to create page:', pageErr?.message)
      throw pageErr
    }

    try {
      await this.hardenPage(page)
      console.log('[BrowserPool] Page hardened successfully')
    } catch (hardenErr: any) {
      pooled.activePagesCount--
      await page.close().catch(() => {})
      console.error('[BrowserPool] Failed to harden page:', hardenErr?.message)
      throw hardenErr
    }

    const release = async () => {
      try {
        await page.close()
      } catch {}

      pooled!.activePagesCount--
      pooled!.lastUsed = Date.now()

      // Process pending requests
      if (this.pendingRequests.length > 0) {
        const pending = this.pendingRequests.shift()
        if (pending) {
          try {
            const result = await this.acquirePage()
            pending.resolve(result)
          } catch (err) {
            pending.reject(err as Error)
          }
        }
      }
    }

    return { page, release }
  }

  async warmup(): Promise<void> {
    if (this.pool.length === 0) {
      const pooled = await this.createBrowser()
      pooled.lastUsed = Date.now()
    }
  }

  getStats() {
    return {
      totalBrowsers: this.pool.length,
      activePagesCount: this.pool.reduce((sum, p) => sum + p.activePagesCount, 0),
      pendingRequests: this.pendingRequests.length,
      maxBrowsers: this.config.maxBrowsers,
      maxPagesPerBrowser: this.config.maxPagesPerBrowser
    }
  }

  async shutdown() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }

    for (const pooled of this.pool) {
      try {
        await pooled.browser.close()
      } catch {}
    }
    this.pool = []
  }
}

// Singleton instance
export const browserPool = new BrowserPool()
