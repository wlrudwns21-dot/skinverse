#!/usr/bin/env node
/**
 * Push whatever is staged in `public/products` into the Storage bucket
 * `product-media`.
 *
 * The directory is normally empty: the artwork lives in the bucket now and was
 * removed from the repository. What this uploads is a new product's files,
 * staged there until they are up. `supabase/functions/media-sync` is the way
 * that needs no terminal and no key, and is what actually gets used — this is
 * the fallback for when a browser is not enough.
 *
 *   SUPABASE_URL=https://xxxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   node scripts/upload-media.mjs
 *
 * Add --dry-run to see what it would do and upload nothing.
 * Add --force to re-upload files that are already there at the same size.
 *
 * ── about that key ──────────────────────────────────────────────────────────
 *
 * The service_role key bypasses row level security, which is exactly why the
 * bucket has no write policy: nothing in a browser can overwrite a product
 * photograph, and this script is the only way in. So the key belongs in your
 * shell for the length of one command and nowhere else — not in .env.local,
 * not in Vercel, not in a commit, and not pasted into a chat. Take it from
 * Supabase Dashboard > Project Settings > API, run this, and close the shell.
 *
 * The script refuses to run if it finds the key in a file rather than the
 * environment, because a key in a file is a key that gets committed.
 */

import { createHash } from 'node:crypto'
import { readFile, readdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const LOCAL = join(ROOT, 'public', 'products')
const BUCKET = 'product-media'
/** Everything lands under this prefix so bucket paths match the URL paths. */
const PREFIX = 'products'

const DRY = process.argv.includes('--dry-run')
const FORCE = process.argv.includes('--force')

const url = (process.env.SUPABASE_URL ?? '').trim().replace(/\/+$/, '')
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()

function die(msg) {
  console.error('\n  ' + msg + '\n')
  process.exit(1)
}

if (!url) die('SUPABASE_URL is not set.')
if (!key) die('SUPABASE_SERVICE_ROLE_KEY is not set. Take it from Dashboard > Project Settings > API.')
if (existsSync(join(ROOT, '.env.local')) && (await readFile(join(ROOT, '.env.local'), 'utf8')).includes(key)) {
  die('The service_role key is sitting in .env.local. Remove it — it must not be in a file.')
}
if (!existsSync(LOCAL)) die(`No ${relative(ROOT, LOCAL)} to upload.`)

const TYPES = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' }

async function walk(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(full)))
    else if (entry.isFile()) out.push(full)
  }
  return out
}

/** What is already in the bucket, as path -> size. */
async function listRemote() {
  const seen = new Map()
  const queue = [PREFIX]
  while (queue.length) {
    const prefix = queue.shift()
    let offset = 0
    for (;;) {
      const res = await fetch(`${url}/storage/v1/object/list/${BUCKET}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } }),
      })
      if (!res.ok) throw new Error(`list ${prefix}: ${res.status} ${await res.text()}`)
      const rows = await res.json()
      for (const r of rows) {
        // A folder comes back with no id. A file carries its metadata.
        if (r.id === null || r.id === undefined) queue.push(`${prefix}/${r.name}`)
        else seen.set(`${prefix}/${r.name}`, r.metadata?.size ?? -1)
      }
      if (rows.length < 1000) break
      offset += rows.length
    }
  }
  return seen
}

const files = (await walk(LOCAL)).sort()
if (!files.length) die('Nothing to upload.')

const totalBytes = (await Promise.all(files.map(async (f) => (await stat(f)).size)))
  .reduce((a, b) => a + b, 0)

console.log(`\n  ${files.length} files, ${(totalBytes / 1048576).toFixed(1)}MB`)
console.log(`  -> ${url}/storage/v1/object/public/${BUCKET}/${PREFIX}/...\n`)

console.log('  reading what is already there...')
const remote = await listRemote()
console.log(`  ${remote.size} already in the bucket\n`)

let up = 0, skipped = 0, failed = 0
const hash = createHash('sha256')

for (const [i, file] of files.entries()) {
  const rel = relative(LOCAL, file).split(sep).join('/')
  const path = `${PREFIX}/${rel}`
  const body = await readFile(file)
  hash.update(path).update(body)

  const ext = file.slice(file.lastIndexOf('.')).toLowerCase()
  const type = TYPES[ext]
  if (!type) { console.log(`  skip (type)  ${rel}`); skipped += 1; continue }

  if (!FORCE && remote.get(path) === body.length) { skipped += 1; continue }
  if (DRY) { console.log(`  would upload ${rel}`); up += 1; continue }

  const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': type,
      // Overwrite rather than fail when the file is already there.
      'x-upsert': 'true',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
    body,
  })
  if (!res.ok) { console.error(`  FAILED ${rel}: ${res.status} ${await res.text()}`); failed += 1 }
  else up += 1

  if ((i + 1) % 50 === 0) console.log(`  ... ${i + 1}/${files.length}`)
}

console.log(`\n  uploaded ${up}, unchanged ${skipped}, failed ${failed}`)
console.log(`  content digest ${hash.digest('hex').slice(0, 16)}`)

if (failed) {
  console.error('\n  Some files did not upload. Nothing has been removed locally — run it again.\n')
  process.exit(1)
}

if (!DRY) {
  console.log(`
  Next:
    1. Check a product page — the photo and the detail artwork. VITE_MEDIA_BASE
       is already set in Vercel to ${url}/storage/v1/object/public/${BUCKET}
    2. Empty public/products again and commit, so the repository stays small.
`)
}
