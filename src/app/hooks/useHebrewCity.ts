// src/app/hooks/useHebrewCity.ts
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type UseHebrewCityOptions = {
  preferGPS?: boolean
  geolocationTimeoutMs?: number
  enabled?: boolean
  fallback?: string
}

export type CityStatus = 'idle' | 'detecting' | 'resolved' | 'fallback' | 'manual'

type CityState = {
  city: string | null
  loading: boolean
  error: string | null
  source: 'gps' | 'ip' | 'fallback' | 'manual' | null
}

const LS_LAST_CITY_KEY = 'chp:last-location'

function readLastCityFromStorage(): { city: string; source: 'manual' | 'gps' | 'ip' | 'fallback' } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(LS_LAST_CITY_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.city === 'string' && parsed.city) {
      return { city: parsed.city, source: parsed.source ?? 'manual' }
    }
  } catch {}
  return null
}

function writeLastCityToStorage(city: string, source: 'manual' | 'gps' | 'ip' | 'fallback') {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LS_LAST_CITY_KEY, JSON.stringify({ city, source, ts: Date.now() }))
  } catch {}
}

/** common Israeli cities + spelling variations */
const EN_TO_HE: Record<string, string> = {
  'jerusalem': 'ירושלים',
  'tel aviv-yafo': 'תל אביב-יפו',
  'tel aviv yafo': 'תל אביב-יפו',
  'tel aviv': 'תל אביב',
  'yafo': 'יפו',
  'haifa': 'חיפה',
  'rishon leziyyon': 'ראשון לציון',
  'rishon lezion': 'ראשון לציון',
  'holon': 'חולון',
  'bat yam': 'בת ים',
  'ramat gan': 'רמת גן',
  'givatayim': 'גבעתיים',
  'bnei brak': 'בני ברק',
  'petah tikva': 'פתח תקווה',
  'rosh haayin': 'ראש העין',
  'rosh ha ayin': 'ראש העין',
  'or yehuda': 'אור יהודה',
  'yehud': 'יהוד',
  'yehud monosson': 'יהוד-מונוסון',
  'kiryat ono': 'קריית אונו',
  'modiin': 'מודיעין',
  'modiin-maccabim-reut': 'מודיעין-מכבים-רעות',
  'modiin maccabim reut': 'מודיעין-מכבים-רעות',
  'modi in': 'מודיעין',
  'shoham': 'שוהם',
  'nes ziona': 'נס ציונה',
  'rehovot': 'רחובות',
  'ramla': 'רמלה',
  'lod': 'לוד',
  'beer yaakov': 'באר יעקב',
  'netanya': 'נתניה',
  'herzliya': 'הרצליה',
  'raanana': 'רעננה',
  "ra'anana": 'רעננה',
  'kfar saba': 'כפר סבא',
  'hod hasharon': 'הוד השרון',
  'even yehuda': 'אבן יהודה',
  'kfaryona': 'כפר יונה',
  'kfar yona': 'כפר יונה',
  "zichron yaakov": 'זכרון יעקב',
  'pardes hana karkur': 'פרדס חנה-כרכור',
  'hadera': 'חדרה',
  'yokneam': 'יקנעם',
  "yokne'am": 'יקנעם',
  'kiryat tivon': 'קריית טבעון',
  'carmiel': 'כרמיאל',
  'tirat carmel': 'טירת כרמל',
  'tirat karmel': 'טירת כרמל',
  'tirat-carmel': 'טירת כרמל',
  'tirat-karmel': 'טירת כרמל',
  'nahariya': 'נהריה',
  'acre': 'עכו',
  'akko': 'עכו',
  'safed': 'צפת',
  'tzfat': 'צפת',
  'tiberias': 'טבריה',
  'afula': 'עפולה',
  'migdal haemeq': 'מגדל העמק',
  'migdal haemek': 'מגדל העמק',
  'nahf': 'נחף',
  'ma alot tarshiha': 'מעלות-תרשיחא',
  "ma'alot tarshiha": 'מעלות-תרשיחא',
  'kiryat shmona': 'קריית שמונה',
  'kiryat ata': 'קריית אתא',
  'kiryat bialik': 'קריית ביאליק',
  'kiryat motzkin': 'קריית מוצקין',
  'kiryat yam': 'קריית ים',
  'ashdod': 'אשדוד',
  'ashkelon': 'אשקלון',
  'sderot': 'שדרות',
  'netivot': 'נתיבות',
  'ofakim': 'אופקים',
  'beersheba': 'באר שבע',
  'beer sheva': 'באר שבע',
  'dimona': 'דימונה',
  'arad': 'ערד',
  'eilat': 'אילת',
  'kiryat gat': 'קריית גת',
  'kiryat malahki': 'קריית מלאכי',
  'kiryat malakhi': 'קריית מלאכי',
  'nazareth': 'נצרת',
  'nof hagalil': 'נוף הגליל',
  'umm al-fahm': 'אום אל-פחם',
  'sakhnin': 'סכנין',
  'rahat': 'רהט'
}

function normalizeCityHe(s: string | null | undefined): string | null {
  if (!s) return null
  const clean = s.replace(/[0-9]/g, '').replace(/-/g, ' ').replace(/\s+/g, ' ').trim()
  if (/[\u0590-\u05FF]/.test(clean)) return clean
  const key = clean.toLowerCase()
  if (EN_TO_HE[key]) return EN_TO_HE[key]
  const firstPart = key.split(',')[0]?.trim()
  if (firstPart && EN_TO_HE[firstPart]) return EN_TO_HE[firstPart]
  return null
}

async function reverseGeocodeHebrew(lat: number, lon: number, signal?: AbortSignal) {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=he`
  const r = await fetch(url, { signal })
  if (!r.ok) throw new Error('reverse-geocode failed')
  const j = await r.json()
  const candidate: string | null =
    j.city || j.locality ||
    j.localityInfo?.administrative?.[0]?.name ||
    j.principalSubdivision || null
  return normalizeCityHe(candidate)
}

async function cityFromIP(signal?: AbortSignal) {
  const sources = [
    { 
      url: 'https://ipwho.is/?lang=he', 
      parser: (j: any) => j?.success ? j.city : null 
    },
    { 
      url: 'https://ip-api.com/json/?fields=status,city&lang=he', 
      parser: (j: any) => j?.status === 'success' ? j.city : null 
    },
    { 
      url: 'https://ipapi.co/json/', 
      parser: (j: any) => j?.city 
    }
  ]
  
  for (const { url, parser } of sources) {
    try {
      const r = await fetch(url, { signal, cache: 'no-cache' })
      if (r.ok) {
        const j = await r.json()
        const city = normalizeCityHe(parser(j))
        if (city) {
          // Validate it's an Israeli city (in Hebrew)
          const isIsraeliCity = Object.values(EN_TO_HE).includes(city)
          const hasHebrew = /[\u0590-\u05FF]/.test(city)
          if (isIsraeliCity || hasHebrew) {
            return city
          }
        }
      }
    } catch {
      // Continue to next source
    }
  }
  return null
}

export function useHebrewCity(
  { preferGPS = true, geolocationTimeoutMs = 6000, enabled = true, fallback = 'תל אביב' }: UseHebrewCityOptions = {}
) {
  // Warm-start from localStorage so repeat visits skip the detection wait.
  // Only used when enabled — disabled means we want the explicit fallback.
  const persisted = enabled ? readLastCityFromStorage() : null

  const [state, setState] = useState<CityState>({
    city: persisted?.city ?? (enabled ? null : fallback),
    loading: enabled && !persisted,
    error: null,
    source: persisted?.source ?? (enabled ? null : 'fallback'),
  })

  const abortRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)

  const setSafely = (updater: (prev: CityState) => CityState) => {
    if (mountedRef.current) setState(updater)
  }

  const getViaGPS = useCallback(async (signal?: AbortSignal) => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      throw new Error('geolocation not available')
    }

    // Check permission first (if supported)
    if ('permissions' in navigator) {
      try {
        const result = await (navigator.permissions as any).query({ name: 'geolocation' })
        if (result.state === 'denied') {
          throw new Error('geolocation permission denied')
        }
      } catch {
        // Some browsers don't support permissions API, continue anyway
      }
    }

    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      let done = false
      const timer = setTimeout(() => {
        if (!done) reject(new Error('geolocation timeout'))
      }, geolocationTimeoutMs)

      navigator.geolocation.getCurrentPosition(
        p => { done = true; clearTimeout(timer); resolve(p) },
        err => { done = true; clearTimeout(timer); reject(err) },
        { enableHighAccuracy: false, timeout: geolocationTimeoutMs, maximumAge: 60_000 }
      )
    })

    const { latitude, longitude } = pos.coords
    const city = await reverseGeocodeHebrew(latitude, longitude, signal)
    if (!city) throw new Error('reverse-geocode returned empty')
    return city
  }, [geolocationTimeoutMs])

  const refresh = useCallback(async () => {
    // if not enabled, just ensure fallback and bail
    if (!enabled) {
      abortRef.current?.abort()
      setSafely(s => ({ ...s, city: fallback, loading: false, source: 'fallback', error: null }))
      return
    }

    abortRef.current?.abort('refresh')
    const ac = new AbortController()
    abortRef.current = ac

    // Immediately clear city to avoid UI flicker to fallback while resolving
    setSafely(s => ({ ...s, city: null, source: null, loading: true, error: null }))

    try {
      if (preferGPS) {
        try {
          const city = await getViaGPS(ac.signal)
          if (city) {
            writeLastCityToStorage(city, 'gps')
            setSafely(s => ({ ...s, city, loading: false, source: 'gps', error: null }))
            return
          }
        } catch (e: any) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[useHebrewCity] GPS failed:', e?.message)
          }
          // Fall through to IP lookup
        }
      }

      const city2 = await cityFromIP(ac.signal)
      if (city2) {
        writeLastCityToStorage(city2, 'ip')
        setSafely(s => ({ ...s, city: city2, loading: false, source: 'ip', error: null }))
        return
      }

      setSafely(s => ({
        ...s,
        city: fallback,
        loading: false,
        source: 'fallback',
        error: 'לא נמצאה עיר — ברירת מחדל: ' + fallback
      }))
    } catch (e: any) {
      if (e?.name === 'AbortError') return
      setSafely(s => ({
        ...s,
        city: fallback,
        loading: false,
        source: 'fallback',
        error: e?.message ?? 'שגיאה — ברירת מחדל: ' + fallback
      }))
    }
  }, [enabled, preferGPS, getViaGPS, fallback])

  // User explicitly picked a city (manual fallback select) — persist it and skip detection.
  const setManualCity = useCallback((city: string) => {
    abortRef.current?.abort('manual')
    writeLastCityToStorage(city, 'manual')
    setSafely(s => ({ ...s, city, loading: false, source: 'manual', error: null }))
  }, [])

  useEffect(() => {
    mountedRef.current = true
    // If we warm-started from localStorage, skip the initial detection and trust
    // that value. The user can still tap "refresh" or change it manually.
    if (!persisted) {
      refresh()
    }
    return () => {
      mountedRef.current = false
      abortRef.current?.abort('cleanup')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh])

  // when toggling from enabled -> disabled, immediately cancel and set fallback
  useEffect(() => {
    if (!enabled) {
      abortRef.current?.abort('disabled')
      setSafely(s => ({ ...s, city: fallback, loading: false, source: 'fallback', error: null }))
    }
    // Note: we don't call refresh() here when enabled changes to true
    // because the refresh callback itself depends on enabled and will trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, fallback])

  // Derived `status` field — UI consumes this instead of inferring from
  // (city, loading, error, source).
  const status: CityStatus =
    !enabled               ? 'idle' :
    state.loading          ? 'detecting' :
    state.source === 'gps' || state.source === 'ip' ? 'resolved' :
    state.source === 'manual' ? 'manual' :
    'fallback'

  return { ...state, status, refresh, setManualCity }
}
