import { describe, expect, it } from 'vitest'
import { checkDimensions, checkFile, MAX_BYTES, MIN_SHORT_SIDE, type ImageProblem } from './imageCheck'
import { authStrings } from '../i18n/auth'

/** A File whose bytes we never read — only type and size are inspected. */
const fileOf = (type: string, size: number) => {
  const file = new File([], 'photo', { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('format and size', () => {
  it('accepts the formats they document', () => {
    for (const type of ['image/jpeg', 'image/jpg', 'image/png']) {
      expect(checkFile(fileOf(type, 1_000_000)).ok).toBe(true)
    }
  })

  it('rejects formats they do not take', () => {
    for (const type of ['image/webp', 'image/heic', 'image/gif', 'application/pdf']) {
      expect(checkFile(fileOf(type, 1_000_000)).problem).toBe('format')
    }
  })

  it('is case-insensitive about the type', () => {
    expect(checkFile(fileOf('IMAGE/JPEG', 1_000)).ok).toBe(true)
  })

  it('enforces their "< 10MB" as a strict limit', () => {
    expect(checkFile(fileOf('image/jpeg', MAX_BYTES - 1)).ok).toBe(true)
    expect(checkFile(fileOf('image/jpeg', MAX_BYTES)).problem).toBe('tooLarge')
  })
})

describe('dimensions', () => {
  it('measures the short side, whichever way the photo is turned', () => {
    // 3000x400 is huge but its short side is 400 — still too small.
    expect(checkDimensions(3000, 400).problem).toBe('tooSmall')
    expect(checkDimensions(400, 3000).problem).toBe('tooSmall')
  })

  it('accepts exactly the minimum', () => {
    expect(checkDimensions(MIN_SHORT_SIDE, MIN_SHORT_SIDE * 2).ok).toBe(true)
    expect(checkDimensions(MIN_SHORT_SIDE - 1, 4000).problem).toBe('tooSmall')
  })

  it('does not reject a long side over 2560 — the vendor downscales it', () => {
    expect(checkDimensions(2000, 4000).ok).toBe(true)
    expect(checkDimensions(2560, 10000).ok).toBe(true)
  })

  it('warns about landscape without blocking it', () => {
    const landscape = checkDimensions(1920, 1080)
    expect(landscape.ok).toBe(true)
    expect(landscape.warning).toBe('landscape')

    // Their docs strongly recommend portrait, but a photo that cannot be
    // retaken is better analysed than refused.
    expect(checkDimensions(1080, 1920).warning).toBeUndefined()
  })

  it('treats a square photo as acceptable', () => {
    expect(checkDimensions(1200, 1200)).toEqual({ ok: true })
  })
})

describe('messages', () => {
  /**
   * The edge function answers a vendor rejection with one of these keys and
   * nothing else — no message text — so a key without a translation would show
   * the customer a blank banner in that language.
   */
  const PROBLEMS: ImageProblem[] = [
    'format', 'tooLarge', 'tooSmall', 'landscape',
    'faceTooSmall', 'faceOutOfBound', 'tooDark', 'resolutionHigh', 'generic',
  ]

  it('has every problem written in every language', () => {
    for (const [lang, strings] of Object.entries(authStrings)) {
      for (const problem of PROBLEMS) {
        expect(strings.photoError[problem], `${lang}.${problem}`).toBeTruthy()
      }
    }
  })
})
