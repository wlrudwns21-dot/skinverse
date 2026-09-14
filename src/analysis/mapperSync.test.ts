import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * The mapper exists twice: once in `src/` where vitest can test it, and once
 * inside the edge function, which deploys as its own bundle and cannot import
 * from the app's source tree.
 *
 * That duplication is the price of testing the exact code that runs in
 * production — but only if the copies stay identical. Silent drift would mean
 * the tests pass while the deployed function maps scores differently, which is
 * precisely the failure this whole module is meant to prevent.
 */
const read = (relative: string) =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8')

/**
 * The header comments differ on purpose; everything after them must not.
 *
 * Drop exactly the first block comment and keep the entire rest of the file.
 * Splitting on every comment terminator instead would compare only as far as
 * the next doc comment, and quietly stop checking the file from there down.
 */
const body = (source: string) => source.slice(source.indexOf('*/') + 2)

describe('edge function mapper copy', () => {
  it('is byte-identical to the tested source', () => {
    const app = body(read('./perfectcorp.ts'))
    const fn = body(read('../../supabase/functions/analyze-skin/mapper.ts'))

    expect(fn).toBe(app)
  })
})
