// src/app/hooks/useHebrewCity.ts
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type UseHebrewCityOptions = {
  preferGPS?: boolean
  geolocationTimeoutMs?: number
}

type CityState = {
  city: string | null
  loading: boolean
  error: string | null
  source: 'gps' | 'ip' | 'fallback' | null
}

/** common Israeli cities + spelling variations */
const EN_TO_HE: Record<string, string> = {
  // big 3 + variants
  'jerusalem': 'ירושלים',
  'tel aviv-yafo': 'תל אביב-יפו',
  'tel aviv yafo': 'תל אביב-יפו',
  'tel aviv': 'תל אביב',
  'yafo': 'יפו',
  'haifa': 'חיפה',

  // center
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

  // sharon / coast
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

  // north
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

  // south
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

  // mixed/arabic-majority cities (common outputs from IP DBs)
  'nazareth': 'נצרת',
  'nof hagalil': 'נוף הגליל',
  'umm al-fahm': 'אום אל-פחם',
  'sakhnin': 'סכנין',
  'rahat': 'רהט',
}

/** normalize & translate to Hebrew if needed */
function normalizeCityHe(s: string | null | undefined): string | null {
  if (!s) return null
  const clean = s
    .replace(/[0-9]/g, '')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // if it's already Hebrew, keep it
  if (/[\u0590-\u05FF]/.test(clean)) return clean

  const key = clean.toLowerCase()
  if (EN_TO_HE[key]) return EN_TO_HE[key]

  // small heuristics for common “City, District” formats
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
  // ipwho.is (Hebrew)
  try {
    const r = await fetch('https://ipwho.is/?lang=he', { signal })
    if (r.ok) {
      const j = await r.json()
      if (j?.success) {
        const c = normalizeCityHe(j.city)
        if (c) return c
      }
    }
  } catch {}

  // ip-api (Hebrew)
  try {
    const r2 = await fetch('https://ip-api.com/json/?fields=status,message,city&lang=he', { signal })
    if (r2.ok) {
      const j2 = await r2.json()
      if (j2?.status === 'success') {
        const c = normalizeCityHe(j2.city)
        if (c) return c
      }
    }
  } catch {}

  return null
}

export function useHebrewCity(
  { preferGPS = true, geolocationTimeoutMs = 6000 }: UseHebrewCityOptions = {}
) {
  const [state, setState] = useState<CityState>({
    city: null,
    loading: true,
    error: null,
    source: null
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

    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      let done = false
      const timer = setTimeout(() => {
        if (!done) reject(new Error('geolocation timeout'))
      }, geolocationTimeoutMs)

      navigator.geolocation.getCurrentPosition(
        (p) => { done = true; clearTimeout(timer); resolve(p) },
        (err) => { done = true; clearTimeout(timer); reject(err) },
        { enableHighAccuracy: false, timeout: geolocationTimeoutMs, maximumAge: 60_000 }
      )
    })

    const { latitude, longitude } = pos.coords
    const city = await reverseGeocodeHebrew(latitude, longitude, signal)
    if (!city) throw new Error('reverse-geocode returned empty')
    return city
  }, [geolocationTimeoutMs])

  const refresh = useCallback(async () => {
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    setSafely(s => ({ ...s, loading: true, error: null }))

    try {
      // 1) GPS first (optional)
      if (preferGPS) {
        try {
          const city = await getViaGPS(ac.signal)
          if (city) {
            setSafely(s => ({ ...s, city, loading: false, source: 'gps', error: null }))
            return
          }
        } catch {/* fall back */}
      }

      // 2) IP fallback
      const city2 = await cityFromIP(ac.signal)
      if (city2) {
        setSafely(s => ({ ...s, city: city2, loading: false, source: 'ip', error: null }))
        return
      }

      // 3) hard fallback – always give a value
      setSafely(s => ({
        ...s,
        city: 'תל אביב',
        loading: false,
        source: 'fallback',
        error: 'לא נמצאה עיר — ברירת מחדל: תל אביב'
      }))
    } catch (e: any) {
      if (e?.name === 'AbortError') return
      // even on unexpected errors, ensure a city value
      setSafely(s => ({
        ...s,
        city: 'תל אביב',
        loading: false,
        source: 'fallback',
        error: e?.message ?? 'שגיאה — ברירת מחדל: תל אביב'
      }))
    }
  }, [preferGPS, getViaGPS])

  useEffect(() => {
    mountedRef.current = true
    refresh()
    return () => {
      mountedRef.current = false
      abortRef.current?.abort()
    }
  }, [refresh])

  return { ...state, refresh }
}