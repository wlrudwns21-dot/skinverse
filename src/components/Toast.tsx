import { s } from '../lib/css'

/**
 * The store toast sits above the bottom nav; the admin console has no nav, so
 * it passes a smaller offset.
 */
export function Toast({ message, bottom = '86px' }: { message: string; bottom?: string }) {
  if (!message) return null
  return (
    <div style={s(`position:fixed;bottom:${bottom};left:50%;transform:translateX(-50%);background:#221C15;color:#F5F0E6;border-radius:999px;padding:10px 18px;font-size:12.5px;font-weight:600;z-index:60;white-space:nowrap;max-width:88vw;overflow:hidden;text-overflow:ellipsis;animation:toastRise .25s ease both;box-shadow:0 8px 24px rgba(0,0,0,0.25)`)}>
      {message}
    </div>
  )
}
