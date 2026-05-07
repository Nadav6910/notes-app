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

// Israeli national bounds (approximate). Used to reject reverse-geocode
// results that are clearly outside Israel \u2014 e.g. a stale roaming GPS fix
// or an IP geolocation that pinned us to a neighbouring country.
const ISRAEL_BOUNDS = { latMin: 29.45, latMax: 33.45, lonMin: 34.20, lonMax: 35.95 }
function isInIsrael(lat: number, lon: number): boolean {
  return (
    lat >= ISRAEL_BOUNDS.latMin && lat <= ISRAEL_BOUNDS.latMax &&
    lon >= ISRAEL_BOUNDS.lonMin && lon <= ISRAEL_BOUNDS.lonMax
  )
}

// Coordinates of major Israeli cities for nearest-neighbour fallback. Used
// when reverse geocoding returns a small town we don't know how to map to
// Hebrew \u2014 we'd rather pin to a known major city than blindly fall back
// to "\u05EA\u05DC \u05D0\u05D1\u05D9\u05D1" for everyone.
const ISRAELI_CITY_COORDS: Array<{ he: string; lat: number; lon: number }> = [
  { he: '\u05EA\u05DC \u05D0\u05D1\u05D9\u05D1',         lat: 32.0853, lon: 34.7818 },
  { he: '\u05D9\u05E8\u05D5\u05E9\u05DC\u05D9\u05DD',         lat: 31.7683, lon: 35.2137 },
  { he: '\u05D7\u05D9\u05E4\u05D4',           lat: 32.7940, lon: 34.9896 },
  { he: '\u05D1\u05D0\u05E8 \u05E9\u05D1\u05E2',         lat: 31.2528, lon: 34.7915 },
  { he: '\u05E8\u05D0\u05E9\u05D5\u05DF \u05DC\u05E6\u05D9\u05D5\u05DF',     lat: 31.9646, lon: 34.8044 },
  { he: '\u05E4\u05EA\u05D7 \u05EA\u05E7\u05D5\u05D5\u05D4',       lat: 32.0871, lon: 34.8867 },
  { he: '\u05E0\u05EA\u05E0\u05D9\u05D4',          lat: 32.3328, lon: 34.8597 },
  { he: '\u05D0\u05E9\u05D3\u05D5\u05D3',          lat: 31.8014, lon: 34.6435 },
  { he: '\u05D0\u05E9\u05E7\u05DC\u05D5\u05DF',         lat: 31.6688, lon: 34.5713 },
  { he: '\u05E8\u05D7\u05D5\u05D1\u05D5\u05EA',         lat: 31.8947, lon: 34.8094 },
  { he: '\u05DE\u05D5\u05D3\u05D9\u05E2\u05D9\u05DF',         lat: 31.8983, lon: 35.0104 },
  { he: '\u05E8\u05DE\u05DC\u05D4',           lat: 31.9290, lon: 34.8667 },
  { he: '\u05DC\u05D5\u05D3',            lat: 31.9510, lon: 34.8950 },
  { he: '\u05DB\u05E4\u05E8 \u05E1\u05D1\u05D0',        lat: 32.1750, lon: 34.9070 },
  { he: '\u05E8\u05E2\u05E0\u05E0\u05D4',          lat: 32.1848, lon: 34.8713 },
  { he: '\u05D4\u05E8\u05E6\u05DC\u05D9\u05D4',         lat: 32.1620, lon: 34.8468 },
  { he: '\u05D7\u05D3\u05E8\u05D4',           lat: 32.4339, lon: 34.9196 },
  { he: '\u05E0\u05E6\u05E8\u05EA',           lat: 32.7000, lon: 35.2950 },
  { he: '\u05D8\u05D1\u05E8\u05D9\u05D4',          lat: 32.7903, lon: 35.5310 },
  { he: '\u05D0\u05D9\u05DC\u05EA',           lat: 29.5577, lon: 34.9519 },
  { he: '\u05E8\u05DE\u05EA \u05D2\u05DF',          lat: 32.0680, lon: 34.8240 },
  { he: '\u05D1\u05E0\u05D9 \u05D1\u05E8\u05E7',         lat: 32.0808, lon: 34.8338 },
  { he: '\u05D7\u05D5\u05DC\u05D5\u05DF',          lat: 32.0167, lon: 34.7792 },
  { he: '\u05D1\u05EA \u05D9\u05DD',          lat: 32.0244, lon: 34.7508 },
  { he: '\u05D2\u05D1\u05E2\u05EA\u05D9\u05D9\u05DD',         lat: 32.0700, lon: 34.8120 },
  { he: '\u05E7\u05E8\u05D9\u05D9\u05EA \u05D2\u05EA',        lat: 31.6100, lon: 34.7642 },
  { he: '\u05E7\u05E8\u05D9\u05D9\u05EA \u05D0\u05D5\u05E0\u05D5',      lat: 32.0631, lon: 34.8559 },
  { he: '\u05E2\u05DB\u05D5',            lat: 32.9281, lon: 35.0818 },
  { he: '\u05E0\u05D4\u05E8\u05D9\u05D4',          lat: 33.0058, lon: 35.0950 },
  { he: '\u05E7\u05E8\u05D9\u05D9\u05EA \u05E9\u05DE\u05D5\u05E0\u05D4',     lat: 33.2074, lon: 35.5697 },
  { he: '\u05D3\u05D9\u05DE\u05D5\u05E0\u05D4',         lat: 31.0700, lon: 35.0322 },
  { he: '\u05E6\u05E4\u05EA',            lat: 32.9658, lon: 35.4983 },
  { he: '\u05E2\u05E4\u05D5\u05DC\u05D4',          lat: 32.6078, lon: 35.2897 },
  { he: '\u05D0\u05D5\u05E8 \u05D9\u05D4\u05D5\u05D3\u05D4',       lat: 32.0319, lon: 34.8553 },
  { he: '\u05D9\u05D4\u05D5\u05D3',           lat: 32.0333, lon: 34.8833 },
  { he: '\u05E8\u05D0\u05E9 \u05D4\u05E2\u05D9\u05DF',       lat: 32.0850, lon: 34.9500 },
  { he: '\u05D4\u05D5\u05D3 \u05D4\u05E9\u05E8\u05D5\u05DF',       lat: 32.1500, lon: 34.8917 },
  { he: '\u05E0\u05E1 \u05E6\u05D9\u05D5\u05E0\u05D4',        lat: 31.9333, lon: 34.7989 },
]

// Haversine great-circle distance in km.
function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const toRad = (d: number) => d * Math.PI / 180
  const R = 6371
  const dLat = toRad(bLat - aLat)
  const dLon = toRad(bLon - aLon)
  const lat1 = toRad(aLat)
  const lat2 = toRad(bLat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// Find the closest known major city to a coordinate. Returns null if the
// coordinate isn't in Israel.
function nearestIsraeliCity(lat: number, lon: number): string | null {
  if (!isInIsrael(lat, lon)) return null
  let best: { he: string; d: number } | null = null
  for (const c of ISRAELI_CITY_COORDS) {
    const d = haversineKm(lat, lon, c.lat, c.lon)
    if (!best || d < best.d) best = { he: c.he, d }
  }
  return best ? best.he : null
}

// Reverse geocode a coordinate to a Hebrew city name, trying multiple
// providers and only accepting Israeli results. We try BigDataCloud first
// (no key, returns Hebrew when asked) and fall back to OSM Nominatim.
// As a last resort, snap the coords to the nearest known major city.
async function reverseGeocodeHebrew(lat: number, lon: number, signal?: AbortSignal): Promise<string | null> {
  if (!isInIsrael(lat, lon)) {
    // The GPS fix isn't in Israel \u2014 we don't trust it. Return null so the
    // caller falls through to IP-based detection.
    return null
  }

  // Provider 1: BigDataCloud reverse-geocode (Hebrew-aware, no key)
  try {
    const r = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=he`,
      { signal },
    )
    if (r.ok) {
      const j = await r.json()
      // Only trust the result if BDC also says we're in Israel
      const cc: string | undefined = j.countryCode || j.countryInfo?.iso3?.slice(0, 2)
      if (!cc || cc.toUpperCase() === 'IL') {
        const candidate: string | null =
          j.city || j.locality ||
          j.localityInfo?.administrative?.[0]?.name ||
          j.principalSubdivision || null
        const mapped = normalizeCityHe(candidate)
        if (mapped) return mapped
      }
    }
  } catch {
    // try next provider
  }

  // Provider 2: OSM Nominatim \u2014 public, no key, supports `accept-language=he`
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=he&zoom=14`,
      { signal, headers: { 'Accept': 'application/json' } },
    )
    if (r.ok) {
      const j = await r.json()
      const cc: string | undefined = j.address?.country_code
      if (!cc || cc.toUpperCase() === 'IL') {
        const candidate: string | null =
          j.address?.city || j.address?.town ||
          j.address?.village || j.address?.municipality ||
          j.address?.suburb || j.address?.county || null
        const mapped = normalizeCityHe(candidate)
        if (mapped) return mapped
      }
    }
  } catch {
    // fall through to nearest-city snap
  }

  // Last resort: snap to the closest major city we know about. The user
  // gets a usable scrape result instead of a generic default.
  return nearestIsraeliCity(lat, lon)
}

async function cityFromIP(signal?: AbortSignal): Promise<string | null> {
  // Each provider gets its own short timeout so a single slow one doesn't
  // dominate. We try them sequentially because most of the time the first
  // one resolves and we don't want to fan out unnecessarily.
  const sources: Array<{ url: string; parser: (j: any) => { city?: string; country?: string; lat?: number; lon?: number } }> = [
    {
      url: 'https://ipwho.is/?lang=he',
      parser: (j: any) => j?.success
        ? { city: j.city, country: j.country_code, lat: j.latitude, lon: j.longitude }
        : {},
    },
    {
      url: 'https://ip-api.com/json/?fields=status,country,countryCode,city,lat,lon&lang=he',
      parser: (j: any) => j?.status === 'success'
        ? { city: j.city, country: j.countryCode, lat: j.lat, lon: j.lon }
        : {},
    },
    {
      url: 'https://ipapi.co/json/',
      parser: (j: any) => ({ city: j?.city, country: j?.country_code, lat: j?.latitude, lon: j?.longitude }),
    },
  ]

  for (const { url, parser } of sources) {
    try {
      // Local AbortController chained off the parent so a slow source can't
      // hold us up for more than 4s.
      const innerAc = new AbortController()
      const onParentAbort = () => innerAc.abort()
      signal?.addEventListener('abort', onParentAbort, { once: true })
      const innerTimer = setTimeout(() => innerAc.abort(), 4_000)

      try {
        const r = await fetch(url, { signal: innerAc.signal, cache: 'no-cache' })
        clearTimeout(innerTimer)
        signal?.removeEventListener('abort', onParentAbort)
        if (!r.ok) continue
        const j = await r.json()
        const { city, country, lat, lon } = parser(j)
        // Insist on country=IL when the provider gave us one
        if (country && country.toUpperCase() !== 'IL') continue
        // If we have GPS-grade lat/lon from the IP provider AND it's in Israel,
        // prefer reverse geocoding it (more accurate than the city string)
        if (typeof lat === 'number' && typeof lon === 'number' && isInIsrael(lat, lon)) {
          const mapped = await reverseGeocodeHebrew(lat, lon, signal)
          if (mapped) return mapped
        }
        const mapped = normalizeCityHe(city)
        if (mapped) {
          const isIsraeliCity = Object.values(EN_TO_HE).includes(mapped)
          const hasHebrew = /[\u0590-\u05FF]/.test(mapped)
          if (isIsraeliCity || hasHebrew) return mapped
        }
      } finally {
        clearTimeout(innerTimer)
        signal?.removeEventListener('abort', onParentAbort)
      }
    } catch {
      // try next provider
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

    // Two-pass GPS strategy:
    // 1. Try high-accuracy with a short timeout. On most modern phones/laptops
    //    this returns a real GPS fix accurate to ~10m.
    // 2. If that times out (e.g. indoors with no GPS lock, or browser is
    //    being slow), fall back to a low-accuracy fix from cell/wifi which
    //    is typically accurate to ~1km — good enough for picking a city.
    // We also cap maximumAge at 30s so we don't act on a stale fix from
    //  a previous location (e.g. user travelled since last lookup).
    const requestPosition = (highAccuracy: boolean, timeoutMs: number) =>
      new Promise<GeolocationPosition>((resolve, reject) => {
        let done = false
        const timer = setTimeout(() => {
          if (!done) reject(new Error('geolocation timeout'))
        }, timeoutMs)

        navigator.geolocation.getCurrentPosition(
          p => { done = true; clearTimeout(timer); resolve(p) },
          err => { done = true; clearTimeout(timer); reject(err) },
          { enableHighAccuracy: highAccuracy, timeout: timeoutMs, maximumAge: 30_000 }
        )
      })

    let pos: GeolocationPosition
    try {
      pos = await requestPosition(true, geolocationTimeoutMs)
    } catch {
      // Fall back to a low-accuracy fix with a slightly longer timeout
      pos = await requestPosition(false, Math.max(geolocationTimeoutMs, 4000))
    }

    const { latitude, longitude, accuracy } = pos.coords

    // If the fix is wildly inaccurate (>20km radius) AND outside Israel,
    // don't trust it — fall back to IP. Inside-Israel low-accuracy fixes
    // are still useful because of nearestIsraeliCity().
    if (accuracy > 20_000 && !isInIsrael(latitude, longitude)) {
      throw new Error(`GPS fix too inaccurate (${Math.round(accuracy)}m)`)
    }

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
