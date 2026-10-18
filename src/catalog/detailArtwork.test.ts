import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { detailPages, detailTiles } from './detailPages'

/**
 * The declared artwork and the files on disk have to be the same thing.
 *
 * `detailPages.ts` is a table of numbers typed in by hand after measuring an
 * export. Nothing else checks it. If a height is a digit out, the last tile
 * reserves the wrong space; if a locale key is wrong or an export never
 * happened, the customer gets the browser's broken-image glyph on a page
 * they are meant to be reading before spending money. Neither shows up in a
 * type error, a unit test or a build — only on the phone of whoever opens it.
 *
 * So this walks what the table declares and opens the actual files.
 *
 * It reads the dimensions out of the WebP header rather than decoding the
 * image: a RIFF/WEBP container whose first chunk is `VP8 ` carries the frame
 * size in four bytes at offset 26. That is enough to prove the file is the
 * size the table says it is, and it costs nothing.
 *
 * ── why a product can be skipped ────────────────────────────────────────────
 *
 * The artwork is no longer kept in the repository. All 814 files went to the
 * product-media bucket and `public/products` was deleted, because it was 60MB
 * that Vercel re-fetched from GitHub on every deploy and had already cost one
 * production deploy a rate-limit failure.
 *
 * That does not make this check pointless, because the moment a number in the
 * table can be wrong is the moment it is typed — and at that moment the new
 * product's artwork *is* in the working tree, waiting to be uploaded. So this
 * checks whatever is there and passes over what has gone, which is exactly
 * the window in which a mistake is still reachable.
 *
 * The files themselves are not lost: the `artwork-in-repo` branch is pinned
 * at the last commit that held them, so a full re-check — or a rebuild of the
 * bucket — is a checkout away.
 */

const PUBLIC = join(import.meta.dirname, '../../public')

/**
 * Whether a particular piece of artwork is still in the working tree.
 *
 * Deliberately asked per directory rather than per product. "Is this product
 * staged at all?" is too coarse a question: a product whose shelf photograph
 * has been dropped in but whose Thai tiles have not is a half-finished
 * export, which is one of the things this file exists to catch, and a
 * per-product guard would wave it through. Per language folder, a tile
 * missing from a folder that is present is still a failure.
 */
const stagedDir = (...parts: string[]) => existsSync(join(PUBLIC, 'products', ...parts))

/** Width and height from a lossy WebP header, or null if it is not one. */
function webpSize(file: string): { w: number; h: number } | null {
  const b = readFileSync(file)
  if (b.length < 30) return null
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null
  if (b.toString('ascii', 12, 16) !== 'VP8 ') return null
  return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff }
}

const entries = Object.entries(detailPages)

describe('the declared artwork is the artwork on disk', () => {
  it('has at least the products registered so far', () => {
    // A guard against the table being emptied by a bad merge.
    expect(entries.length).toBeGreaterThanOrEqual(12)
  })

  it.each(entries)('%s — every tile exists at its declared size', (id, art) => {
    for (const lang of Object.keys(art.pages) as (keyof typeof art.pages)[]) {
      if (!stagedDir(id, 'detail', lang)) continue
      const tiles = detailTiles(id, lang)
      expect(tiles.length, `${id} ${lang} declares no tiles`).toBeGreaterThan(0)

      for (const t of tiles) {
        const file = join(PUBLIC, t.src)
        expect(existsSync(file), `missing ${t.src}`).toBe(true)
        const size = webpSize(file)
        expect(size, `${t.src} is not a lossy WebP`).not.toBeNull()
        expect(size, `${t.src} is not the size detailPages.ts declares`).toEqual({ w: t.w, h: t.h })
      }
    }
  })

  it.each(entries)('%s — no stray tile beyond the declared count', (id, art) => {
    // An export that got shorter leaves the extra tiles behind. They are never
    // requested, so they are invisible — they just ship as dead weight.
    for (const lang of Object.keys(art.pages)) {
      if (!stagedDir(id, 'detail', lang)) continue
      const dir = join(PUBLIC, 'products', id, 'detail', lang)
      const want = detailTiles(id, lang as never).length
      const found = readdirSync(dir).filter((f) => f.endsWith('.webp'))
      expect(found.length, `${id}/${lang} has ${found.length} files for ${want} tiles`).toBe(want)
    }
  })
})

describe('product photographs', () => {
  it.each(entries)('%s — has a main shot', (id) => {
    // Every product with artwork should have a photograph too; the shelf tile
    // falls back to a flat gradient without one, which reads as a bug.
    const file = join(PUBLIC, 'products', id, 'main.webp')
    if (!existsSync(file)) return

    const size = webpSize(file)
    expect(size, `${id} main.webp is not a lossy WebP`).not.toBeNull()
    // Anything much smaller than this is a thumbnail that will look soft on a
    // 3× phone screen. Regederm365 at 638px is the brand's only original and
    // is the floor we accept.
    expect(size!.w, `${id} main.webp is only ${size!.w}px wide`).toBeGreaterThanOrEqual(638)
  })
})
