/**
 * Move the product photographs into Storage, from a browser, once.
 *
 * The shop's detail artwork is 543 files and 39MB sitting in `public/products`,
 * which means Vercel downloads it from GitHub on every single deploy. That has
 * already failed once with a secondary rate limit, and it gets worse with each
 * product. The fix is to serve the images from a Storage bucket instead — see
 * docs/product-media.md — and the one step that needs doing by hand is getting
 * the files in there.
 *
 * `scripts/upload-media.mjs` does it from a terminal with the service_role key.
 * This does the same thing without either. The owner sets one secret, opens one
 * address, and this fetches the files from the repository — which is public, so
 * nothing here is exposed that a visitor could not already download — and
 * writes them into the bucket.
 *
 * ── it does the work in batches on purpose ──────────────────────────────────
 *
 * 543 fetch-and-upload pairs take longer than a browser is willing to wait, and
 * longer than an edge function is allowed to run. So each request handles a
 * hundred and the page refreshes itself to the next offset. Nothing can time
 * out, the owner watches a count climb, and if a batch fails it stops there and
 * says so rather than reporting a success it did not have.
 *
 * Every upload upserts, so re-running any offset is free and safe. There is no
 * state anywhere: the offset in the address is all of it.
 *
 * ── what stops anyone else running it ───────────────────────────────────────
 *
 * `MEDIA_SYNC_TOKEN`, which the owner sets in Dashboard > Edge Functions >
 * Secrets and nobody else knows. Without it this returns 401 and touches
 * nothing. JWT verification is off because a browser following a link cannot
 * send an Authorization header — the token is the authentication, and that is
 * the only reason it is off.
 *
 * Even with the token, the damage it can do is bounded to re-uploading the
 * repository's own product images: the source repository is fixed below, the
 * destination bucket is fixed, and every path is re-checked against
 * MEDIA_PATH after it crosses the network. It cannot be pointed at another
 * repository, another bucket, or another prefix.
 *
 * ── delete it when the migration is done ────────────────────────────────────
 *
 * This is a one-off. Once the bucket is serving the live site, remove the
 * function and the secret. It is not part of how the shop runs.
 */

/** Where the images come from. Fixed — not a parameter. */
const OWNER = 'wlrudwns21-dot'
const REPO = 'skinverse'
const MANIFEST = 'scripts/media-manifest.json'

/** Where they go. Fixed — not a parameter. */
const BUCKET = 'product-media'

/** How many files one request handles, and how many at a time within it. */
const BATCH = 100
const CONCURRENCY = 6

/**
 * The only shapes a product media path may have. Kept identical to the copy in
 * scripts/media-manifest.mjs, which checks the list as it is written; this one
 * checks it again after it has been downloaded, because by then each string is
 * a bucket write target.
 */
const MEDIA_PATH =
  /^products\/[a-z0-9][a-z0-9-]*\/(main\.webp|detail\/(ko|en|zh|th)\/\d{1,3}\.webp)$/

/** A git ref, narrow enough that it cannot climb out of the repository. */
const REF = /^[A-Za-z0-9._/-]{1,100}$/

const SUPABASE_URL = (Deno.env.get('SUPABASE_URL') ?? '').replace(/\/+$/, '')

/** A legacy `anon`/`service_role` key: three base64url segments of a JWT. */
const looksLikeJwt = (k: string) => /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(k)

/**
 * How to authenticate a write to Storage.
 *
 * This project has moved to the new API keys, and they are not JWTs. Sending
 * one on `Authorization: Bearer` makes the platform try to parse it as a JWT
 * and refuse the request — which is exactly what happened on the first run:
 * every upload came back `403 Invalid Compact JWS`. The new keys go on the
 * `apikey` header and nowhere else.
 *
 * Both key families are still live here, so rather than hard-coding either
 * convention this picks whichever key the runtime actually provides and sends
 * it the way that key wants to be sent. A legacy JWT gets both headers, which
 * is what every other function in this project does and is known to work; a
 * new secret key gets `apikey` alone.
 */
function storageAuth(): { headers: Record<string, string>; how: string } | null {
  const named = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (named) {
    try {
      const keys = JSON.parse(named) as Record<string, string>
      const key = (keys['default'] ?? Object.values(keys)[0] ?? '').trim()
      if (key) return { headers: { apikey: key }, how: 'secret key / apikey' }
    } catch {
      // Malformed JSON: fall through to the legacy key rather than give up.
    }
  }

  const legacy = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '').trim()
  if (!legacy) return null
  return looksLikeJwt(legacy)
    ? {
        headers: { apikey: legacy, Authorization: `Bearer ${legacy}` },
        how: 'service_role JWT / apikey + bearer',
      }
    : { headers: { apikey: legacy }, how: 'service_role (not a JWT) / apikey' }
}

const AUTH = storageAuth()

/**
 * Trimmed, because the value is pasted into a dashboard field by hand and a
 * trailing newline is invisible there and fatal here. The owner's first attempt
 * failed on exactly this class of problem.
 */
const TOKEN = (Deno.env.get('MEDIA_SYNC_TOKEN') ?? '').trim()

/** Length-independent comparison, so the token cannot be guessed a byte at a time. */
function tokenMatches(given: string): boolean {
  if (!TOKEN || !given) return false
  const a = new TextEncoder().encode(given)
  const b = new TextEncoder().encode(TOKEN)
  let diff = a.length ^ b.length
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0)
  }
  return diff === 0
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * Every non-ASCII character as a numeric reference, so the response is pure
 * ASCII and cannot be decoded wrongly.
 *
 * `charset=utf-8` is set on both the header and a meta tag and the Korean still
 * arrived as mojibake for the owner. Rather than keep guessing which layer
 * dropped it, this removes the question: there are no bytes above 127 left to
 * misinterpret, under any charset. Written in Korean in the source and
 * converted on the way out, so the source stays readable.
 *
 * `Array.from` walks code points, not UTF-16 units, so a character outside the
 * BMP survives as one reference instead of two broken halves.
 */
const ncr = (s: string) =>
  Array.from(s, (c) => {
    const n = c.codePointAt(0) as number
    return n > 127 ? `&#${n};` : c
  }).join('')

/** One page of the progress report. Korean, because the reader is the owner. */
function page(title: string, body: string, refreshTo?: string, status = 200): Response {
  const html = `<!doctype html>
<html lang="ko"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
${refreshTo ? `<meta http-equiv="refresh" content="1;url=${esc(refreshTo)}">` : ''}
<title>${esc(title)}</title>
<style>
  :root { color-scheme: light dark; }
  body {
    margin: 0; padding: 32px 20px; font: 16px/1.7 -apple-system, BlinkMacSystemFont,
    "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif;
    max-width: 34rem; margin-inline: auto; word-break: keep-all;
  }
  h1 { font-size: 1.25rem; margin: 0 0 1.5rem; }
  .bar { height: 10px; border-radius: 99px; background: rgba(128,128,128,.25); overflow: hidden; }
  .bar > i { display: block; height: 100%; background: currentColor; border-radius: 99px; }
  .n { font-variant-numeric: tabular-nums; font-size: 1.6rem; font-weight: 600; }
  .muted { opacity: .65; font-size: .9rem; }
  ul { padding-left: 1.1rem; }
  code { font-size: .85em; word-break: break-all; }
  a.btn {
    display: inline-block; margin-top: 1.25rem; padding: .7rem 1.2rem;
    border: 1px solid currentColor; border-radius: 10px; text-decoration: none;
  }
</style>
</head><body>
<h1>${esc(title)}</h1>
${body}
</body></html>`
  return new Response(ncr(html), {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

const fail = (status: number, title: string, body: string) => page(title, body, undefined, status)

interface Manifest {
  bucket: string
  files: [string, number][]
}

async function loadManifest(ref: string): Promise<Manifest> {
  const url = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${ref}/${MANIFEST}`
  const res = await fetch(url, { headers: { 'User-Agent': 'skinverse-media-sync' } })
  if (!res.ok) throw new Error(`목록을 가져오지 못했습니다 (${res.status}) — ${url}`)

  const parsed = (await res.json()) as Manifest
  if (parsed?.bucket !== BUCKET) throw new Error('목록이 다른 버킷을 가리키고 있습니다.')
  if (!Array.isArray(parsed.files) || parsed.files.length === 0) {
    throw new Error('목록이 비어 있습니다.')
  }
  for (const row of parsed.files) {
    if (!Array.isArray(row) || typeof row[0] !== 'string' || typeof row[1] !== 'number') {
      throw new Error('목록의 형식이 올바르지 않습니다.')
    }
    if (!MEDIA_PATH.test(row[0])) throw new Error(`허용되지 않은 경로: ${row[0]}`)
  }
  // Sorted so an offset means the same file on every request, whatever order
  // the list happens to be written in.
  parsed.files.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
  return parsed
}

/**
 * Returned instead of an error when there was nothing to do.
 *
 * A symbol rather than a string, because every other non-null return from
 * `move` is an error message shown to the owner, and a sentinel that could be
 * mistaken for one is a bug waiting to happen.
 */
const SKIP = Symbol('already in the bucket')

/**
 * Whether the bucket already holds this file, whole.
 *
 * This is what lets the manifest stay a record of the whole bucket after the
 * artwork has left the repository. `public/products` is not in git any more —
 * it was 60MB that Vercel re-fetched on every deploy — so a re-run would try
 * to download 814 files that raw.githubusercontent.com no longer has and
 * report 814 failures. Asking the bucket first turns that into 814 quick
 * HEADs and no work, and leaves only genuinely new artwork to fetch.
 *
 * The size is checked as well as the existence, so a file that was truncated
 * on the way in last time is re-uploaded rather than passed over. Anything
 * unexpected — a network blip, a surprising status — answers "no" and lets the
 * normal path run, which is safe because every upload upserts.
 */
async function already(path: string, size: number): Promise<boolean> {
  try {
    const head = await fetch(`${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`, {
      method: 'HEAD',
    })
    if (!head.ok) return false
    return Number(head.headers.get('content-length')) === size
  } catch {
    return false
  }
}

/** Fetch one file from the repository and put it in the bucket. */
async function move(
  path: string,
  size: number,
  ref: string,
  auth: Record<string, string>,
): Promise<string | null | typeof SKIP> {
  if (await already(path, size)) return SKIP

  const from = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${ref}/public/${path}`
  const got = await fetch(from, { headers: { 'User-Agent': 'skinverse-media-sync' } })
  if (!got.ok) return `${path} — 깃허브 ${got.status}`

  const body = new Uint8Array(await got.arrayBuffer())
  // A truncated download uploads perfectly happily and then paints grey in the
  // shop, so the size recorded beside the path is checked before it is written.
  if (body.byteLength !== size) {
    return `${path} — 크기가 다릅니다 (${body.byteLength} ≠ ${size})`
  }

  const put = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      ...auth,
      'Content-Type': 'image/webp',
      'x-upsert': 'true',
      // The path contains no version, but the contents of a given path never
      // change — a new tile is a new product id. Safe to cache for a year.
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
    body,
  })
  if (!put.ok) return `${path} — 저장소 ${put.status} ${(await put.text()).slice(0, 200)}`
  return null
}

/** Run the batch with a bounded number in flight. */
async function runBatch(
  slice: [string, number][],
  ref: string,
  auth: Record<string, string>,
): Promise<{ done: number; skipped: number; errors: string[] }> {
  let next = 0
  let done = 0
  let skipped = 0
  const errors: string[] = []

  const worker = async () => {
    for (;;) {
      const i = next
      next += 1
      if (i >= slice.length) return
      const [path, size] = slice[i]
      try {
        const err = await move(path, size, ref, auth)
        // Skipped files count towards `done`: the caller uses it to draw a
        // progress bar, and "already there" is as finished as a file gets.
        if (err === SKIP) {
          skipped += 1
          done += 1
        } else if (err) errors.push(err)
        else done += 1
      } catch (e) {
        errors.push(`${path} — ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, slice.length) }, worker))
  return { done, skipped, errors }
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url)
  const token = url.searchParams.get('token') ?? req.headers.get('x-sync-token') ?? ''

  if (!TOKEN) {
    return fail(
      503,
      '아직 준비가 안 됐습니다',
      `<p>Supabase 대시보드에서 <code>MEDIA_SYNC_TOKEN</code> 비밀값을 먼저 등록해 주세요.</p>
       <p class="muted">Dashboard → Edge Functions → Secrets</p>`,
    )
  }
  if (!tokenMatches(token)) {
    return fail(
      401,
      '주소가 맞지 않습니다',
      `<p>주소 끝의 <code>token=</code> 값이 등록한 비밀값과 다릅니다.</p>`,
    )
  }
  if (!SUPABASE_URL || !AUTH) {
    return fail(500, '설정 오류', `<p>함수에 저장소 접근 정보가 없습니다.</p>`)
  }

  const ref = url.searchParams.get('ref') ?? 'main'
  if (!REF.test(ref) || ref.includes('..')) {
    return fail(400, '설정 오류', `<p>브랜치 이름이 올바르지 않습니다.</p>`)
  }

  const rawFrom = url.searchParams.get('from') ?? '0'
  const from = /^\d{1,6}$/.test(rawFrom) ? Number(rawFrom) : NaN
  if (!Number.isInteger(from) || from < 0) {
    return fail(400, '설정 오류', `<p>시작 번호가 올바르지 않습니다.</p>`)
  }

  let manifest: Manifest
  try {
    manifest = await loadManifest(ref)
  } catch (e) {
    return fail(
      502,
      '사진 목록을 읽지 못했습니다',
      `<p>${esc(e instanceof Error ? e.message : String(e))}</p>
       <p class="muted">깃허브에 <code>${esc(MANIFEST)}</code> 가 올라가 있어야 합니다.</p>`,
    )
  }

  const total = manifest.files.length

  /**
   * The address of this same function at another offset — as a query string and
   * nothing else.
   *
   * It is deliberately not built from `url.pathname`. The path an edge function
   * sees for itself is not always the path the browser used to reach it, and a
   * link built from the inside one would send the browser somewhere that is not
   * here, breaking the automatic advance. A bare `?a=b` is resolved by the
   * browser against whatever address it is actually on, which is the right one
   * by definition.
   */
  const here = (n: number) => {
    const q = new URLSearchParams(url.search)
    q.set('from', String(n))
    return '?' + q.toString()
  }

  if (from >= total) {
    return page(
      '사진 옮기기 완료',
      `<p class="n">${total} / ${total}</p>
       <div class="bar"><i style="width:100%"></i></div>
       <p style="margin-top:1.5rem">사진 ${total}장이 모두 저장소에 들어갔습니다.</p>
       <p>이제 Vercel 환경변수만 넣으면 됩니다. 클로드에게 끝났다고 알려주세요.</p>`,
    )
  }

  const slice = manifest.files.slice(from, from + BATCH)
  const { done, skipped, errors } = await runBatch(slice, ref, AUTH.headers)

  /**
   * Where the next request starts.
   *
   * Only a clean batch advances. With a failure in it the offset stays put,
   * because the files that failed may have been anywhere in the batch and
   * `from + done` would step over them. Re-running the batch re-uploads the
   * ones that worked, which costs a few seconds and skips nothing.
   */
  const resume = errors.length ? from : from + slice.length
  const moved = from + done
  const pct = Math.round((moved / total) * 100)

  const bar = `<div class="bar"><i style="width:${pct}%"></i></div>`
  const count = `<p class="n">${moved} / ${total}</p>`

  if (errors.length) {
    return page(
      '중간에 멈췄습니다',
      `${count}${bar}
       <p style="margin-top:1.5rem">${errors.length}장이 실패해서 여기서 멈췄습니다.
       이미 올라간 것은 그대로 있으니, 아래를 눌러 이어서 하면 됩니다.</p>
       <ul>${errors.slice(0, 10).map((e) => `<li><code>${esc(e)}</code></li>`).join('')}</ul>
       ${errors.length > 10 ? `<p class="muted">그 외 ${errors.length - 10}장</p>` : ''}
       <a class="btn" href="${esc(here(resume))}">이어서 하기</a>
       <p class="muted">계속 같은 곳에서 멈추면 이 화면을 캡처해서 클로드에게 보여주세요.
       인증 방식: <code>${esc(AUTH.how)}</code></p>`,
    )
  }

  return page(
    '사진 옮기는 중',
    `${count}${bar}
     <p style="margin-top:1.5rem">잠시만 기다려 주세요. 화면이 알아서 다음으로 넘어갑니다.</p>
     ${
       skipped
         ? `<p class="muted">이번 ${slice.length}장 중 ${skipped}장은 이미 저장소에 있어 건너뛰었습니다.</p>`
         : ''
     }
     <p class="muted">창을 닫아도 괜찮습니다 — 다시 같은 주소를 열면 이어서 합니다.</p>
     <noscript><a class="btn" href="${esc(here(resume))}">다음</a></noscript>`,
    here(resume),
  )
})
