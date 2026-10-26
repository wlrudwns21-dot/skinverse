/**
 * Put a new product's artwork into Storage, from a browser.
 *
 * The shop's detail artwork used to sit in `public/products`, which meant
 * Vercel downloaded 60MB from GitHub on every single deploy. That failed once
 * with a secondary rate limit, and it got worse with every product. So the
 * images are served from a Storage bucket instead — see docs/product-media.md
 * — and the step that needs doing by hand is getting new files in there.
 *
 * `scripts/upload-media.mjs` does it from a terminal with the service_role key.
 * This does the same thing without either. The owner sets one secret, opens one
 * address, and this fetches the files from the repository — which is public, so
 * nothing here is exposed that a visitor could not already download — and
 * writes them into the bucket.
 *
 * ── how a new product gets its pictures up ──────────────────────────────────
 *
 * Artwork goes into `public/products/<id>/`, `npm run media:manifest` adds it
 * to the list, and both are committed and pushed. The owner then opens this
 * address and watches it finish. Afterwards the files come back out of
 * `public/products` so the repository stays small — the bucket is where they
 * live now, and the manifest is the record of what is in it.
 *
 * ── it does the work in batches on purpose ──────────────────────────────────
 *
 * Hundreds of fetch-and-upload pairs take longer than a browser is willing to
 * wait, and longer than an edge function is allowed to run. So each request
 * handles a hundred and the page refreshes itself to the next offset. Nothing
 * can time out, the owner watches a count climb, and if a batch fails it stops
 * there and says so rather than reporting a success it did not have.
 *
 * The list is the whole bucket, not just the new files, so most of it is
 * already there. `nextWork` is what keeps that cheap: it HEADs ahead until it
 * has found a batch of files the bucket is actually missing, so every request
 * does real work instead of spending itself skipping.
 *
 * Every upload upserts, so re-running any offset is free and safe. There is no
 * state anywhere: the offset in the address is all of it.
 *
 * ── what stops anyone else running it ───────────────────────────────────────
 *
 * `MEDIA_SYNC_TOKEN`, which the owner sets in Dashboard > Edge Functions >
 * Secrets and nobody else knows. Without it this touches nothing. JWT
 * verification is off because a browser following a link cannot send an
 * Authorization header — the token is the authentication, and that is the
 * only reason it is off.
 *
 * It is typed into a form, not carried in the address. The address bar is the
 * wrong place for a secret: it is in the history, in the screenshot, and — as
 * this page refreshes itself through the batches — in every refresh as well.
 * It leaked that way twice before the form existed. What the form accepts goes
 * into an HttpOnly cookie and the address stays clean from then on. A link
 * with `?token=` still works, and the first thing it does is move the token
 * out of the address and send the browser back here without it.
 *
 * Even with the token, the damage it can do is bounded to re-uploading the
 * repository's own product images: the source repository is fixed below, the
 * destination bucket is fixed, and every path is re-checked against
 * MEDIA_PATH after it crosses the network. It cannot be pointed at another
 * repository, another bucket, or another prefix.
 *
 * ── it outlived the migration ───────────────────────────────────────────────
 *
 * This was written as a one-off to be deleted once the bucket was serving the
 * live site. It is kept because the job did not turn out to be one-off: every
 * product registered from now on needs its pictures moved the same way, and
 * this is the only way to do it that asks the owner for a click rather than a
 * terminal and a service_role key. Its sibling `media-pump`, which carried a
 * key in its own source, really was a one-off and now answers 410.
 */

/** Where the images come from. Fixed — not a parameter. */
const OWNER = 'wlrudwns21-dot'
const REPO = 'skinverse'
const MANIFEST = 'scripts/media-manifest.json'

/** Where they go. Fixed — not a parameter. */
const BUCKET = 'product-media'

/** How many files one request uploads, and how many at a time within it. */
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

/**
 * Every reading of the token the caller might have meant.
 *
 * A secret in a query string is not a secret in a string. `+` decodes to a
 * space, `&` ends the parameter, `#` ends the whole URL — so a token with any
 * of those in it arrives as something the owner never typed, and the only
 * feedback is "does not match", which sends them hunting for a value that was
 * right all along. That is what this cost on the first two attempts.
 *
 * So both readings are tried: the normal one, and the raw parameter decoded
 * without the plus-is-a-space rule. Both are trimmed, because `TOKEN` is
 * trimmed and a value pasted out of a dashboard tends to bring a space with
 * it. `&` and `#` still cannot be recovered — nothing reaches the function to
 * recover — but that only ever bites a link someone typed by hand, and such a
 * link now lands on the form, which has none of these problems.
 */
function offeredTokens(url: URL, req: Request): string[] {
  const out: string[] = []
  const add = (v: string | null | undefined) => {
    const t = (v ?? '').trim()
    if (t && !out.includes(t)) out.push(t)
  }

  add(url.searchParams.get('token'))

  const raw = url.search
    .replace(/^\?/, '')
    .split('&')
    .map((pair) => pair.split('='))
    .find(([k]) => k === 'token')?.[1]
  if (raw) {
    // decodeURIComponent leaves '+' alone, which is the point.
    try {
      add(decodeURIComponent(raw))
    } catch {
      // A stray '%' makes this throw. The plain reading above still stands.
    }
  }

  add(req.headers.get('x-sync-token'))
  add(cookieToken(req))
  return out
}

/**
 * The name of the cookie the token rides in after it has been typed once.
 *
 * Path is `/` rather than this function's path on purpose: the comment on
 * `here()` explains that the path an edge function sees for itself is not
 * always the one the browser used, and a cookie scoped to the wrong path is
 * simply never sent back.
 */
const COOKIE = 'ms_t'

function cookieToken(req: Request): string {
  const jar = req.headers.get('cookie') ?? ''
  for (const part of jar.split(';')) {
    const eq = part.indexOf('=')
    if (eq < 0) continue
    if (part.slice(0, eq).trim() !== COOKIE) continue
    try {
      return decodeURIComponent(part.slice(eq + 1).trim())
    } catch {
      return ''
    }
  }
  return ''
}

/**
 * Hand the browser the token back, to send with every later request.
 *
 * `HttpOnly` so no script can read it, `Secure` because the function is only
 * reachable over TLS, `SameSite=Strict` so another site cannot make the
 * browser spend it. Two hours is far longer than a sync takes and short
 * enough that a shared laptop does not keep it.
 */
const cookieHeader = (token: string) =>
  `${COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=7200; HttpOnly; Secure; SameSite=Strict`

/**
 * What arrived, described without describing what was expected.
 *
 * Enough for the owner to spot the angle brackets they pasted or the space
 * that rode along, and nothing an attacker could use: it never mentions the
 * stored value, not even its length.
 */
function describeOffered(url: URL): string {
  const seen = url.searchParams.get('token') ?? ''
  if (!seen) return '주소에 token 값이 아예 없습니다'
  const notes: string[] = [`${seen.length}자가 도착했습니다`]
  if (/\s/.test(seen)) notes.push('공백이 섞여 있습니다 (복사할 때 딸려왔거나, 원래 값에 + 가 있었을 수 있습니다)')
  if (/[<>]/.test(seen)) notes.push('꺾쇠표 < > 가 들어 있습니다 — 안내문의 괄호까지 복사하신 것 같습니다')
  return notes.join(' · ')
}

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

/**
 * The other way in: a secret this project's own database holds.
 *
 * `MEDIA_SYNC_TOKEN` is for a person with a browser, and a person with a
 * browser is the part of this that keeps going wrong — the gateway note below
 * explains why the page barely renders, and every round of it has had to be
 * clicked through by hand. The database does not have that problem. It can
 * reach this function over pg_net, so the sync can be driven from a SQL
 * statement and the owner never has to open the page at all.
 *
 * That needs a secret the database can send, and the env var is not one: only
 * the dashboard can read it back, and nothing in SQL can. So there is a second
 * secret, generated in the database and never leaving it, checked here by
 * asking the database whether the token it was handed is that secret.
 *
 * `media_sync_token_ok` is SECURITY DEFINER and granted to service_role alone,
 * which is the key this function already holds in order to write to the
 * bucket. It takes a token and answers yes or no — it never returns the
 * secret, so a leak of this function's source gives nothing away. Anything
 * unexpected answers no and the caller falls through to the normal 401.
 */
async function dbTokenOk(given: string): Promise<boolean> {
  if (!SUPABASE_URL || !AUTH || !given) return false
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/media_sync_token_ok`, {
      method: 'POST',
      headers: { ...AUTH.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_token: given }),
    })
    return res.ok && (await res.json()) === true
  } catch {
    return false
  }
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
 * The layer has since been identified, and it is not one we can argue with.
 * The gateway in front of edge functions rewrites the Content-Type of every
 * GET response to a bare `text/plain`, whatever the function set. A throwaway
 * function proved it: `text/html`, `text/html; charset=utf-8`, with and
 * without Cache-Control, with an explicit Content-Length, even
 * `application/xhtml+xml` — all five came back `text/plain` on GET, and the
 * same header on a POST came back untouched.
 *
 * So the charset was never dropped by a decoder, it was removed wholesale,
 * and this escaping is what makes the page legible at all. It also explains
 * the page the owner sees: a browser handed `text/plain` prints the markup
 * instead of drawing it, which is why the password field "does not appear"
 * and why the meta refresh never advances a batch on its own. Nothing here
 * can fix that — the page has to stop being the way this is driven.
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

/**
 * The same answers, for a caller that is not a person.
 *
 * `?format=json` is what the database asks for. It matters less that this is
 * tidier than scraping a number out of the HTML, and more that the HTML is
 * not reliable to scrape: the gateway strips the Content-Type off every GET,
 * so the page is already being handled as text rather than markup, and the
 * one thing a driver must get right is where to resume. That is a field here.
 */
const asJson = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })

/**
 * Ask for the token once, in a form, instead of taking it from the address.
 *
 * The address bar is the wrong place for a secret. It is in the history, in
 * the screenshot, and — because this page refreshes itself through the
 * batches — in every one of those refreshes too. It leaked twice that way
 * before this form existed, and each leak cost a rotation.
 *
 * A POSTed form body is in none of those places. It also ends the `+`
 * problem: in a form body the browser sends `+` as `%2B`, so a token with a
 * plus in it finally arrives as itself.
 */
function askPage(note: string, status = 200): Response {
  return page(
    '비밀값을 입력해 주세요',
    `${note}
     <form method="post" autocomplete="off">
       <p><input type="password" name="token" required autofocus
                 style="width:100%;box-sizing:border-box;padding:.7rem .8rem;font:inherit;
                        border:1px solid currentColor;border-radius:10px;background:transparent;
                        color:inherit"></p>
       <p><button class="btn" type="submit" style="font:inherit;background:transparent;color:inherit;cursor:pointer">시작하기</button></p>
     </form>
     <p class="muted">Dashboard → Edge Functions → Secrets 의 <code>MEDIA_SYNC_TOKEN</code> 값입니다.
     Supabase는 저장하면 값을 가려서 다시 볼 수 없으니, 기억나지 않으시면 거기서
     <b>새 값으로 덮어쓰고</b> 그 값을 넣으세요.</p>
     <p class="muted">여기에 넣은 값은 주소에 남지 않습니다. 이 브라우저에만 두 시간 동안 보관되고,
     그동안은 다시 묻지 않습니다.</p>`,
    undefined,
    status,
  )
}

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
 * to download files that raw.githubusercontent.com no longer has and report
 * them all as failures. Asking the bucket first turns that into a quick HEAD
 * and no work, and leaves only genuinely new artwork to fetch.
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

/**
 * Find the next files that actually need uploading, skipping what is there.
 *
 * The batch used to be "the next hundred rows of the manifest", which was
 * right while the manifest was the migration and every row needed moving. It
 * is wrong now that the list is the whole bucket and a new product is a
 * handful of rows at the end of it: the manifest is sorted by path, so
 * `products/sw-...` sorts after every other brand, and adding Sulwhasoo put
 * 155 new files at positions 814 to 968. The owner would have had to sit
 * through eight rounds of skipping a hundred files each before the first
 * upload — and a page that looks like it is doing nothing is a page people
 * close.
 *
 * So the scan is cheap and the batch is the work. HEAD is a round trip with
 * no body, sixty at a time, so sweeping the whole list costs a couple of
 * seconds and the hundred uploads that follow are all real.
 */
async function nextWork(
  files: [string, number][],
  from: number,
  limit: number,
): Promise<{ todo: [string, number][]; scannedTo: number; skipped: number }> {
  const todo: [string, number][] = []
  let i = from
  let skipped = 0
  const SCAN = 60

  while (i < files.length && todo.length < limit) {
    const end = Math.min(i + SCAN, files.length)
    const slice = files.slice(i, end)
    const present = await Promise.all(slice.map(([path, size]) => already(path, size)))

    for (let k = 0; k < slice.length; k += 1) {
      if (present[k]) {
        skipped += 1
      } else {
        todo.push(slice[k])
        // Stop on the file that fills the batch, so the next request picks up
        // immediately after it rather than re-walking what we just uploaded.
        if (todo.length >= limit) return { todo, scannedTo: i + k + 1, skipped }
      }
    }
    i = end
  }
  return { todo, scannedTo: i, skipped }
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

/** 303 so the browser re-asks with GET, and a relative target so it resolves here. */
function redirect(to: string, token?: string): Response {
  const headers = new Headers({ Location: to, 'Cache-Control': 'no-store' })
  if (token) headers.append('Set-Cookie', cookieHeader(token))
  return new Response(null, { status: 303, headers })
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url)
  /** The database asks for this. A browser never does. */
  const wantsJson = url.searchParams.get('format') === 'json'

  // The form, and nothing else, posts here.
  if (req.method === 'POST') {
    let typed = ''
    try {
      typed = String((await req.formData()).get('token') ?? '').trim()
    } catch {
      typed = ''
    }
    if (!tokenMatches(typed)) {
      return askPage(
        `<p>그 값이 아닙니다.</p>
         <p class="muted">${typed ? `${typed.length}자가 도착했습니다` : '아무것도 입력되지 않았습니다'}.</p>`,
        401,
      )
    }
    return redirect('?from=0', typed)
  }

  const offered = offeredTokens(url, req)
  let good = offered.find(tokenMatches)

  // Nothing matched the env secret. Before refusing, ask the database whether
  // it recognises one of them — that is how a sync driven from SQL gets in.
  if (!good) {
    for (const t of offered) {
      if (await dbTokenOk(t)) {
        good = t
        break
      }
    }
  }

  if (!good) {
    if (wantsJson) return asJson(401, { ok: false, reason: 'bad_token' })
    if (!TOKEN) {
      return fail(
        503,
        '아직 준비가 안 됐습니다',
        `<p>Supabase 대시보드에서 <code>MEDIA_SYNC_TOKEN</code> 비밀값을 먼저 등록해 주세요.</p>
         <p class="muted">Dashboard → Edge Functions → Secrets</p>`,
      )
    }
    const seen = url.searchParams.get('token') ?? ''
    return askPage(
      seen
        ? `<p>주소에 들어 있던 값이 등록한 비밀값과 다릅니다. 아래에 다시 넣어 주세요.</p>
           <p class="muted">주소로 도착한 값: ${esc(describeOffered(url))}</p>`
        : '',
      seen ? 401 : 200,
    )
  }

  /**
   * A token that arrived in the address does not stay there.
   *
   * It is moved into the cookie and the browser is sent back to the same page
   * without it, so it is out of the address bar — and out of every later
   * self-refresh — before a single file is uploaded. An old bookmark keeps
   * working, and stops leaking on its first use.
   */
  if (url.searchParams.get('token')) {
    const clean = new URLSearchParams(url.search)
    clean.delete('token')
    const q = clean.toString()
    return redirect(q ? `?${q}` : '?from=0', good)
  }

  if (!SUPABASE_URL || !AUTH) {
    if (wantsJson) return asJson(500, { ok: false, reason: 'no_storage_credentials' })
    return fail(500, '설정 오류', `<p>함수에 저장소 접근 정보가 없습니다.</p>`)
  }

  const ref = url.searchParams.get('ref') ?? 'main'
  if (!REF.test(ref) || ref.includes('..')) {
    if (wantsJson) return asJson(400, { ok: false, reason: 'bad_ref' })
    return fail(400, '설정 오류', `<p>브랜치 이름이 올바르지 않습니다.</p>`)
  }

  const rawFrom = url.searchParams.get('from') ?? '0'
  const from = /^\d{1,6}$/.test(rawFrom) ? Number(rawFrom) : NaN
  if (!Number.isInteger(from) || from < 0) {
    if (wantsJson) return asJson(400, { ok: false, reason: 'bad_from' })
    return fail(400, '설정 오류', `<p>시작 번호가 올바르지 않습니다.</p>`)
  }

  let manifest: Manifest
  try {
    manifest = await loadManifest(ref)
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e)
    if (wantsJson) return asJson(502, { ok: false, reason: 'manifest_unreadable', detail: why })
    return fail(
      502,
      '사진 목록을 읽지 못했습니다',
      `<p>${esc(why)}</p>
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
    q.delete('token') // never put it back into an address
    q.set('from', String(n))
    return '?' + q.toString()
  }

  if (from >= total) {
    if (wantsJson) return asJson(200, { ok: true, done: true, moved: total, total, uploaded: 0, skipped: 0 })
    return page(
      '사진 옮기기 완료',
      `<p class="n">${total} / ${total}</p>
       <div class="bar"><i style="width:100%"></i></div>
       <p style="margin-top:1.5rem">사진 ${total}장이 모두 저장소에 들어갔습니다.</p>
       <p>클로드에게 끝났다고 알려주세요.</p>`,
    )
  }

  const { todo, scannedTo, skipped: passed } = await nextWork(manifest.files, from, BATCH)

  // Nothing left anywhere ahead of us: the bucket already holds the rest.
  if (todo.length === 0) {
    if (wantsJson) {
      return asJson(200, { ok: true, done: true, moved: total, total, uploaded: 0, skipped: passed })
    }
    return page(
      '사진 옮기기 완료',
      `<p class="n">${total} / ${total}</p>
       <div class="bar"><i style="width:100%"></i></div>
       <p style="margin-top:1.5rem">사진 ${total}장이 모두 저장소에 들어가 있습니다.</p>
       <p class="muted">이번에 확인만 하고 넘어간 것 ${passed}장 — 이미 올라가 있어 다시 올리지 않았습니다.</p>`,
    )
  }

  // `skipped` is dropped: nextWork already filtered, so runBatch can only skip
  // a file that appeared in the bucket between the scan and the upload, which
  // is a harmless race and not something to report.
  const { done, errors } = await runBatch(todo, ref, AUTH.headers)

  /**
   * Where the next request starts.
   *
   * Only a clean batch advances. With a failure in it the offset stays put,
   * because the files that failed may have been anywhere in the batch and
   * stepping over them would skip them for good.
   */
  const resume = errors.length ? from : scannedTo
  // Everything behind the scan is accounted for: either it was already in the
  // bucket or this request has just put it there.
  const moved = Math.min(total, scannedTo - todo.length + done)
  const pct = Math.round((moved / total) * 100)

  const bar = `<div class="bar"><i style="width:${pct}%"></i></div>`
  const count = `<p class="n">${moved} / ${total}</p>`

  if (errors.length) {
    if (wantsJson) {
      return asJson(200, {
        ok: false,
        done: false,
        moved,
        total,
        resume,
        uploaded: done,
        skipped: passed,
        errors: errors.slice(0, 20),
        errorCount: errors.length,
        auth: AUTH.how,
      })
    }
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

  if (wantsJson) {
    return asJson(200, {
      ok: true,
      done: resume >= total,
      moved,
      total,
      resume,
      uploaded: done,
      skipped: passed,
    })
  }

  return page(
    '사진 옮기는 중',
    `${count}${bar}
     <p style="margin-top:1.5rem">잠시만 기다려 주세요. 화면이 알아서 다음으로 넘어갑니다.</p>
     <p class="muted">${passed}장은 이미 저장소에 있어 건너뛰고, ${todo.length}장을 올렸습니다.</p>
     <p class="muted">창을 닫아도 괜찮습니다 — 다시 같은 주소를 열면 이어서 합니다.</p>
     <noscript><a class="btn" href="${esc(here(resume))}">다음</a></noscript>`,
    here(resume),
  )
})
