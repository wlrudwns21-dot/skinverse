#!/usr/bin/env node
/**
 * Write down what `public/products` contains, so the sync function can fetch it
 * without asking GitHub's API anything.
 *
 *   node scripts/media-manifest.mjs            # writes scripts/media-manifest.json
 *   node scripts/media-manifest.mjs --check    # exits 1 if the file is stale
 *
 * ── why a committed list and not the GitHub API ──────────────────────────────
 *
 * The sync function could ask `git/trees?recursive=1` for the file list, but
 * api.github.com allows 60 unauthenticated requests an hour per address and
 * Supabase's edge network shares addresses between everybody's functions. A
 * 403 there leaves the owner staring at an error page for a reason that has
 * nothing to do with them. raw.githubusercontent.com — where the images come
 * from anyway — is far more generous, so the list lives there too, as a file.
 *
 * The sizes are here so the function can tell a truncated download from a whole
 * one. A tile that arrives half-length still uploads happily and then paints
 * grey in the shop, which is the kind of failure nobody notices for a week.
 */

import { readdir, stat, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const LOCAL = join(ROOT, 'public', 'products')
const OUT = join(ROOT, 'scripts', 'media-manifest.json')

const CHECK = process.argv.includes('--check')

/**
 * The only shapes a product media path may have.
 *
 * The sync function re-applies this to the list it downloads, because by then
 * the list has crossed a network and a path is a bucket write target. Keeping
 * the two in step is the point of writing it out in both places.
 */
export const MEDIA_PATH = /^products\/[a-z0-9][a-z0-9-]*\/(main\.webp|detail\/(ko|en|zh|th)\/\d{1,3}\.webp)$/

async function walk(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(full)))
    else if (entry.isFile()) out.push(full)
  }
  return out
}

if (!existsSync(LOCAL)) {
  console.error(`\n  No ${relative(ROOT, LOCAL)}.\n`)
  process.exit(1)
}

const files = []
for (const abs of (await walk(LOCAL)).sort()) {
  const path = 'products/' + relative(LOCAL, abs).split(sep).join('/')
  if (!MEDIA_PATH.test(path)) {
    console.error(`\n  Unexpected path, refusing to list it: ${path}\n`)
    process.exit(1)
  }
  files.push([path, (await stat(abs)).size])
}

const bytes = files.reduce((a, [, n]) => a + n, 0)
const manifest = {
  bucket: 'product-media',
  files,
}

// Two spaces would triple the size for no one's benefit — this is read by a
// program. One entry per line still keeps the diff legible when a product is
// added.
const text =
  '{\n  "bucket": ' +
  JSON.stringify(manifest.bucket) +
  ',\n  "files": [\n' +
  files.map(([p, n]) => `    [${JSON.stringify(p)}, ${n}]`).join(',\n') +
  '\n  ]\n}\n'

if (CHECK) {
  const current = existsSync(OUT) ? await readFile(OUT, 'utf8') : ''
  if (current !== text) {
    console.error(
      `\n  scripts/media-manifest.json is out of date.\n` +
        `  Run: node scripts/media-manifest.mjs\n`,
    )
    process.exit(1)
  }
  console.log(`  manifest matches ${files.length} files`)
} else {
  await writeFile(OUT, text)
  console.log(
    `\n  ${files.length} files, ${(bytes / 1048576).toFixed(1)}MB` +
      `\n  -> ${relative(ROOT, OUT)}\n`,
  )
}
