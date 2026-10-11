import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * `media()` reads its base once, at module load, so each case has to reset
 * the module registry and re-import with the environment it is testing.
 */
async function withBase(value: string | undefined) {
  vi.resetModules()
  if (value === undefined) vi.stubEnv('VITE_MEDIA_BASE', '')
  else vi.stubEnv('VITE_MEDIA_BASE', value)
  return await import('./media')
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

const MAIN = '/products/an-pdrn-ha-cleansing-foam-150/main.webp'
const TILE = '/products/da-waterfull-toneup-sun-pink-50/detail/ko/3.webp'

describe('with no base configured', () => {
  it('leaves paths alone, so the app serves from its own origin', async () => {
    // This is the state of every checkout that has not been told otherwise,
    // including a fresh clone and `vite dev`. It must keep working.
    const { media, mediaIsRemote } = await withBase(undefined)
    expect(media(MAIN)).toBe(MAIN)
    expect(media(TILE)).toBe(TILE)
    expect(mediaIsRemote).toBe(false)
  })

  it('treats an empty or whitespace variable as not configured', async () => {
    expect((await withBase('')).media(MAIN)).toBe(MAIN)
    expect((await withBase('   ')).media(MAIN)).toBe(MAIN)
  })
})

describe('with a storage base', () => {
  const BASE = 'https://pfovxylewqthuhecfgvx.supabase.co/storage/v1/object/public/product-media'

  it('puts the base in front, keeping the path intact', async () => {
    // The path is what the database stores and what the tile table builds,
    // so it has to survive untouched or the bucket layout stops matching.
    const { media, mediaIsRemote } = await withBase(BASE)
    expect(media(MAIN)).toBe(BASE + MAIN)
    expect(media(TILE)).toBe(BASE + TILE)
    expect(mediaIsRemote).toBe(true)
  })

  it('does not double the slash when the base has a trailing one', async () => {
    const { media } = await withBase(BASE + '/')
    expect(media(MAIN)).toBe(BASE + MAIN)
    expect(media(MAIN)).not.toContain('//products')
  })
})

describe('what it refuses to touch', () => {
  const BASE = 'https://cdn.example.com'

  it('passes an absolute URL through', async () => {
    const { media } = await withBase(BASE)
    expect(media('https://example.com/a.webp')).toBe('https://example.com/a.webp')
    expect(media('//example.com/a.webp')).toBe('//example.com/a.webp')
  })

  it('passes an unrooted path through rather than guessing', async () => {
    // A relative path would resolve against whatever route the reader is on,
    // which is a different image on every screen. Prefixing it would invent a
    // URL. Neither is right, so it is handed back and shows as a broken
    // image — visible, rather than silently wrong.
    const { media } = await withBase(BASE)
    expect(media('products/x/main.webp')).toBe('products/x/main.webp')
  })

  it('gives back an empty string for no path', async () => {
    // Products with no photograph store '' and the shelf paints a gradient.
    const { media } = await withBase(BASE)
    expect(media('')).toBe('')
  })
})
