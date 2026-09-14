/**
 * Pre-flight checks on the customer's photo, before it costs anything.
 *
 * Every analysis call is billed, and Perfect Corp rejects images that miss
 * their spec — so an undersized photo sent anyway burns a unit and returns an
 * error. Everything they publish that a browser can verify is checked here
 * first, which also means the customer hears about it instantly instead of
 * after a round trip.
 *
 * What we cannot check locally is face coverage (their rule: face width > 60%
 * of image width). That needs face detection, so it stays a server-side error
 * we translate rather than prevent.
 */

/** Their limit is "< 10MB". */
export const MAX_BYTES = 10 * 1024 * 1024

export const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'] as const

/**
 * Minimum length of the *short* side, per tier.
 *
 * SD accepts 480; HD needs 1080. We gate on SD so an SD account is never
 * blocked by a rule that does not apply to it — an HD account sending a 600px
 * photo gets the vendor's own `error_below_min_image_size`, which we translate.
 * Flip this if the account is HD-only and you would rather fail fast.
 */
export type Tier = 'sd' | 'hd'
export const TIER = 'sd' as Tier
export const MIN_SHORT_SIDE = TIER === 'hd' ? 1080 : 480

/** Above this the vendor downscales for us, so it is not a rejection. */
export const AUTO_RESIZE_ABOVE = 2560

/**
 * Everything that can be wrong with a photo.
 *
 * The first four are decided here, before the call. The rest need the vendor's
 * face detection, so they come back from the edge function as a code we look up
 * in the same `photoError` table — one vocabulary, whoever noticed the problem.
 */
export type ImageProblem =
  | 'format'
  | 'tooLarge'
  | 'tooSmall'
  /** Landscape: their docs strongly recommend portrait for skin analysis. */
  | 'landscape'
  | 'faceTooSmall'
  | 'faceOutOfBound'
  | 'tooDark'
  | 'resolutionHigh'
  | 'noFace'
  | 'pose'
  | 'generic'

export interface ImageCheck {
  ok: boolean
  /** A hard stop — sending this would waste a paid call. */
  problem?: ImageProblem
  /** Not a rejection, just worth telling the customer. */
  warning?: ImageProblem
}

/** The part that needs no image decoding, so it can be tested directly. */
export function checkDimensions(width: number, height: number): ImageCheck {
  const shortSide = Math.min(width, height)

  if (shortSide < MIN_SHORT_SIDE) return { ok: false, problem: 'tooSmall' }
  // Landscape still analyses; it just produces worse results, so warn and let
  // the customer decide rather than blocking a photo they may not be able to retake.
  if (width > height) return { ok: true, warning: 'landscape' }
  return { ok: true }
}

export function checkFile(file: File): ImageCheck {
  const type = file.type.toLowerCase()
  if (!ALLOWED_TYPES.includes(type as (typeof ALLOWED_TYPES)[number])) {
    return { ok: false, problem: 'format' }
  }
  if (file.size >= MAX_BYTES) return { ok: false, problem: 'tooLarge' }
  return { ok: true }
}

/**
 * Full check, including the pixel dimensions.
 *
 * A photo we cannot decode is let through rather than rejected: the browser
 * failing to read it does not prove the vendor will, and blocking a valid photo
 * is worse than spending one call to find out.
 */
export async function checkPhoto(file: File): Promise<ImageCheck> {
  const basic = checkFile(file)
  if (!basic.ok) return basic

  try {
    const bitmap = await createImageBitmap(file)
    const result = checkDimensions(bitmap.width, bitmap.height)
    bitmap.close?.()
    return result
  } catch {
    return { ok: true }
  }
}
