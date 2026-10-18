import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { detailPages, detailTiles } from './detailPages'
import { aesturaProducts } from '../data/aestura'
import type { Lang } from '../data/types'

/**
 * The list the sync function works from, checked against what is actually on
 * disk and what the app actually asks for.
 *
 * The sync function cannot be run from here — it lives on Supabase's edge and
 * fetches from GitHub. What can be checked is the thing that would silently go
 * wrong: the list drifting out of step with the artwork, so that a product
 * looks fine locally and paints grey once the shop is served from the bucket.
 */

const ROOT = join(__dirname, '..', '..')
const MANIFEST = join(ROOT, 'scripts', 'media-manifest.json')
const LANGS: Lang[] = ['ko', 'en', 'zh', 'th']

interface Manifest {
  bucket: string
  files: [string, number][]
}

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8')) as Manifest
const sizes = new Map(manifest.files)

describe('the manifest itself', () => {
  it('names the bucket the function is pinned to', () => {
    // The function refuses a manifest pointing anywhere else, so a mismatch
    // here is a 502 in the owner's browser rather than a wrong write.
    expect(manifest.bucket).toBe('product-media')
  })

  it('lists no path twice', () => {
    expect(sizes.size).toBe(manifest.files.length)
  })

  it('records any artwork still staged in the repository at its real size', () => {
    // The function compares each download against this number and refuses to
    // upload a mismatch, so a wrong size here stops a new product going up.
    //
    // It used to check all 814, because all 814 were in `public/products`.
    // They are not any more — that directory was 60MB Vercel re-fetched on
    // every deploy, and it went once the bucket held everything. What is left
    // to check is whatever is staged for the next upload, which is usually
    // nothing; for the rest the bucket is the authority, and the size was
    // verified against this number at the moment each file was written.
    const wrong: string[] = []
    for (const [path, size] of manifest.files) {
      const abs = join(ROOT, 'public', path)
      if (!existsSync(abs)) continue
      const real = statSync(abs).size
      if (real !== size) wrong.push(`${path}: listed ${size}, on disk ${real}`)
    }
    expect(wrong).toEqual([])
  })

  it('only contains paths the function will accept', () => {
    // Re-checked after crossing a network, because by then each one is a
    // bucket write target. Keep this in step with MEDIA_PATH in both sources.
    const allowed = /^products\/[a-z0-9][a-z0-9-]*\/(main\.webp|detail\/(ko|en|zh|th)\/\d{1,3}\.webp)$/
    expect(manifest.files.map(([p]) => p).filter((p) => !allowed.test(p))).toEqual([])
  })
})

describe('the two copies of the path rule', () => {
  /** Pull the MEDIA_PATH literal out of a source file, whitespace and all. */
  function ruleIn(file: string): string {
    const src = readFileSync(join(ROOT, file), 'utf8')
    const m = src.match(/MEDIA_PATH\s*=\s*(\/\^products[^\n]*?\/)\s*$/m)
    expect(m, `no MEDIA_PATH found in ${file}`).toBeTruthy()
    return m![1]
  }

  it('agree, because one guards writing the list and the other guards using it', () => {
    // The generator rejects an odd path before it is ever written down; the
    // function rejects one after download, when the list is untrusted input.
    // Two checks is right, two *different* checks is a hole.
    expect(ruleIn('supabase/functions/media-sync/index.ts')).toBe(
      ruleIn('scripts/media-manifest.mjs'),
    )
  })
})

describe('what the app will ask the bucket for', () => {
  it('has every detail tile of every product in every language', () => {
    // This is the failure the migration could actually ship: artwork that is
    // in the repository, rendered fine from `public/`, and simply absent from
    // the bucket. The reader gets a grey column where the maker's page was.
    const missing: string[] = []
    for (const id of Object.keys(detailPages)) {
      for (const lang of LANGS) {
        for (const tile of detailTiles(id, lang)) {
          const path = tile.src.replace(/^\//, '')
          if (!sizes.has(path)) missing.push(path)
        }
      }
    }
    expect(missing).toEqual([])
  })

  /**
   * The shelf photographs.
   *
   * The catalogue lives in the database, so the authority on `products.image`
   * is not in this repository. What is here is `detailPages`, and every row in
   * the database that carries an image is a product with detail artwork — the
   * two sets were checked against each other when this was written. So a
   * missing `main.webp` for a `detailPages` id is the failure worth catching,
   * and the Aestura seeds are checked as well because they state their paths
   * outright.
   */
  it('has a shelf photograph for every product with detail artwork', () => {
    const missing = Object.keys(detailPages)
      .map((id) => `products/${id}/main.webp`)
      .filter((path) => !sizes.has(path))
    expect(missing).toEqual([])
  })

  it('has the shelf photograph each Aestura seed names', () => {
    const missing: string[] = []
    for (const p of aesturaProducts) {
      if (!p.image?.startsWith('/products/')) continue
      const path = p.image.replace(/^\//, '')
      if (!sizes.has(path)) missing.push(`${p.id} -> ${path}`)
    }
    expect(missing).toEqual([])
  })

  it('lists nothing the app never asks for', () => {
    // 39MB is being moved; carrying a file nobody reads means carrying it for
    // ever, because the reason to notice it is gone with `public/products`.
    const wanted = new Set<string>()
    for (const id of Object.keys(detailPages)) {
      wanted.add(`products/${id}/main.webp`)
      for (const lang of LANGS) {
        for (const tile of detailTiles(id, lang)) wanted.add(tile.src.replace(/^\//, ''))
      }
    }
    expect([...sizes.keys()].filter((p) => !wanted.has(p))).toEqual([])
  })
})
