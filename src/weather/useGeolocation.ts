import { useCallback, useEffect, useRef, useState } from 'react'

export type GeoStatus = 'idle' | 'asking' | 'granted' | 'denied' | 'unavailable'

export interface Coords {
  lat: number
  lon: number
}

/** Our own deadline — see the watchdog note in `request`. */
const WATCHDOG_MS = 12000

/**
 * Browser location, asked for only when the visitor presses the button.
 *
 * Deliberately not requested on load: an unexplained permission prompt the
 * moment a page opens is the fastest way to get it denied for good, and the
 * routine screen works fine without it.
 *
 * Requires a secure context — HTTPS or localhost. On Vercel that is satisfied.
 */
export function useGeolocation() {
  const [status, setStatus] = useState<GeoStatus>('idle')
  const [coords, setCoords] = useState<Coords | null>(null)
  const watchdog = useRef<ReturnType<typeof setTimeout> | null>(null)
  const settled = useRef(false)

  const stopWatchdog = () => {
    if (watchdog.current) clearTimeout(watchdog.current)
    watchdog.current = null
  }

  useEffect(() => stopWatchdog, [])

  const request = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unavailable')
      return
    }

    stopWatchdog()
    settled.current = false
    setStatus('asking')

    // The spec's own `timeout` is not dependable: some browsers — and any
    // environment with no location provider behind the API — call neither
    // callback, which would leave the screen stuck on "finding you" forever.
    // This watchdog guarantees the UI always resolves to something the visitor
    // can act on.
    watchdog.current = setTimeout(() => {
      if (settled.current) return
      settled.current = true
      setStatus('unavailable')
    }, WATCHDOG_MS)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (settled.current) return
        settled.current = true
        stopWatchdog()
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude })
        setStatus('granted')
      },
      (err) => {
        if (settled.current) return
        settled.current = true
        stopWatchdog()
        // PERMISSION_DENIED is the visitor's answer; the rest are failures we
        // cannot fix from here, and both end the same way — keep the city list.
        setStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable')
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    )
  }, [])

  const clear = useCallback(() => {
    stopWatchdog()
    settled.current = true
    setCoords(null)
    setStatus('idle')
  }, [])

  return { status, coords, request, clear }
}
