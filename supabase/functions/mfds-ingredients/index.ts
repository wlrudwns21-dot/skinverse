import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsFor } from './cors.ts'

/**
 * Mirror the 식약처 register of cosmetic ingredients into our own table.
 *
 * 공공데이터포털 15111774, `getCsmtcsIngdCpntInfoService01`. 이용허락범위 제한 없음.
 *
 * Why a copy and not a live lookup: reading one product label means matching
 * twenty or thirty names, and the register allows 10,000 calls a day for the
 * whole site. It also changes a few times a year, so a nightly-at-most sync
 * loses nothing — and a government API being slow must not make a product page
 * slow with it.
 *
 * Only operators may start a sync, and the API key lives in this function's
 * secrets. It is never sent to a browser.
 *
 * The register is uneven. For 가공소금 every field but the Korean name comes
 * back empty, and that is normal rather than an error: blanks are stored as
 * null and nothing downstream may assume an English name or a CAS number
 * exists. The one field always present is the Korean name, which is the one
 * the matcher needs.
 */

const ENDPOINT =
  'https://apis.data.go.kr/1471000/CsmtcsIngdCpntInfoService01/getCsmtcsIngdCpntInfoService01'

/**
 * Rows per request.
 *
 * The portal documents no ceiling and most of its services accept 1,000. If a
 * larger page is silently truncated we would stop early and think we were
 * done, so the loop below trusts `totalCount` rather than the size of a page.
 */
const PAGE_SIZE = 1000

/**
 * A hard stop, in pages.
 *
 * The register holds tens of thousands of rows, not millions. If the loop is
 * still going after this many pages then something is wrong with the paging —
 * a service that ignores `pageNo` would otherwise return page one for ever and
 * burn the whole daily quota on it.
 */
const MAX_PAGES = 200

const json = (body: unknown, status: number, cors: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })

/** Empty, whitespace and the literal strings the portal uses for "no value". */
function clean(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  if (!t || t === '-' || t === 'null' || t === '해당없음') return null
  return t
}

interface Row {
  kor_name: string
  eng_name: string | null
  cas_no: string | null
  origin: string | null
  synonym: string | null
}

interface Page {
  rows: Row[]
  total: number
}

/**
 * One page of the register.
 *
 * The service answers XML by default and JSON on request. JSON is asked for,
 * but a failure there is reported rather than parsed around: the portal
 * signals a bad key or an exceeded quota by returning an XML fault *with*
 * HTTP 200, so a body that will not parse as JSON is far more likely to be an
 * error document than a success we should salvage.
 */
async function fetchPage(key: string, pageNo: number): Promise<Page> {
  const url = new URL(ENDPOINT)
  // The portal double-encodes keys in its own examples. URLSearchParams
  // encodes once, which is what the service actually wants.
  url.searchParams.set('serviceKey', key)
  url.searchParams.set('pageNo', String(pageNo))
  url.searchParams.set('numOfRows', String(PAGE_SIZE))
  url.searchParams.set('type', 'json')

  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  const text = await res.text()

  if (!res.ok) {
    throw new Error(`공공데이터포털 HTTP ${res.status}: ${text.slice(0, 200)}`)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    // Almost always an XML fault: SERVICE_KEY_IS_NOT_REGISTERED_ERROR,
    // LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR and friends. Surface
    // the portal's own words — they name the problem precisely.
    const msg = /<returnAuthMsg>([^<]*)<|<resultMsg>([^<]*)</.exec(text)
    throw new Error(`공공데이터포털 응답을 읽을 수 없습니다: ${msg?.[1] ?? msg?.[2] ?? text.slice(0, 200)}`)
  }

  const body = (parsed as Record<string, Record<string, unknown>>)?.body ??
    (parsed as Record<string, Record<string, Record<string, unknown>>>)?.response?.body
  const header = (parsed as Record<string, Record<string, unknown>>)?.header ??
    (parsed as Record<string, Record<string, Record<string, unknown>>>)?.response?.header

  const code = clean(header?.resultCode)
  if (code && code !== '00') {
    throw new Error(`공공데이터포털 오류 ${code}: ${clean(header?.resultMsg) ?? ''}`)
  }
  if (!body) throw new Error('공공데이터포털 응답에 body가 없습니다.')

  // `items` comes back as an array, as `{item: [...]}`, or — for a single
  // result — as a bare object. All three shapes are real.
  const raw = body.items as unknown
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as Record<string, unknown>)?.item)
      ? ((raw as Record<string, unknown>).item as unknown[])
      : raw && typeof raw === 'object'
        ? [(raw as Record<string, unknown>).item ?? raw]
        : []

  const rows: Row[] = []
  for (const entry of list) {
    const r = entry as Record<string, unknown>
    const kor = clean(r.INGR_KOR_NAME)
    // Without a Korean name there is nothing to match against, so the row
    // cannot serve its only purpose. Skipped rather than stored blank.
    if (!kor) continue
    rows.push({
      kor_name: kor,
      eng_name: clean(r.INGR_ENG_NAME),
      cas_no: clean(r.CAS_NO),
      origin: clean(r.ORIGIN_MAJOR_KOR_NAME),
      synonym: clean(r.INGR_SYNONYM),
    })
  }

  const total = Number(clean(body.totalCount) ?? 0)
  return { rows, total: Number.isFinite(total) ? total : 0 }
}

Deno.serve(async (req) => {
  const cors = corsFor(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, cors)

  const key = Deno.env.get('DATA_GO_KR_KEY') ?? ''
  if (!key) {
    return json(
      { error: 'not_configured', hint: 'Edge Function Secrets에 DATA_GO_KR_KEY를 넣어 주세요.' },
      503,
      cors,
    )
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  )

  // An active operator, identified by the email inside their own verified
  // token. A sync spends a chunk of the day's quota and rewrites the table
  // every customer reads, so it is not something a logged-in customer may do.
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return json({ error: 'operators_only' }, 401, cors)

  const { data: who } = await admin.auth.getUser(token)
  const email = (who.user?.email ?? '').toLowerCase()
  if (!email) return json({ error: 'operators_only' }, 401, cors)

  const { data: operator, error: opError } = await admin
    .from('admin_users')
    .select('email')
    .eq('email', email)
    .eq('status', 'active')
    .maybeSingle()
  if (opError) return json({ error: 'unavailable' }, 503, cors)
  if (!operator) return json({ error: 'not_an_operator' }, 403, cors)

  let body: { pages?: number; from?: number } = {}
  try {
    body = (await req.json()) as typeof body
  } catch {
    // No body is fine — it means "sync everything".
  }

  // `pages` exists so the first run can be a single page: proving the key
  // works and seeing what the data really looks like should not cost a full
  // sync. Absent, the loop runs until `totalCount` is covered.
  const pageLimit = Number.isFinite(body.pages) && (body.pages as number) > 0
    ? Math.min(Math.floor(body.pages as number), MAX_PAGES)
    : MAX_PAGES
  const firstPage = Number.isFinite(body.from) && (body.from as number) > 0
    ? Math.floor(body.from as number)
    : 1

  let written = 0
  let fetched = 0
  let total = 0
  let pages = 0

  try {
    for (let i = 0; i < pageLimit; i++) {
      const pageNo = firstPage + i
      const page = await fetchPage(key, pageNo)
      pages++
      if (page.total) total = page.total
      fetched += page.rows.length

      if (page.rows.length === 0) break

      /*
       * Upsert on (kor_name, cas_no), which is the register's own identity for
       * a material — the same name appears more than once with different CAS
       * numbers, and those are different entries, not duplicates.
       *
       * `blurb` is deliberately absent from the update: it is our own writing
       * about the ingredient, not the Ministry's, and a re-sync must not wipe
       * it.
       */
      const { error, count } = await admin
        .from('ingredients')
        .upsert(
          page.rows.map((r) => ({ ...r, source: 'mfds', synced_at: new Date().toISOString() })),
          { onConflict: 'kor_name,cas_no', ignoreDuplicates: false, count: 'exact' },
        )
      if (error) throw new Error(`저장 실패 (page ${pageNo}): ${error.message}`)
      written += count ?? page.rows.length

      // Every row the register says it has, seen.
      if (total && firstPage === 1 && fetched >= total) break
      // A short page is the last page.
      if (page.rows.length < PAGE_SIZE) break
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('mfds sync failed', message)
    // Partial progress is reported rather than discarded: the rows already
    // upserted are in the table, and the caller needs to know where to resume.
    return json(
      { error: 'sync_failed', message, pages, fetched, written, total, resumeFrom: firstPage + pages },
      502,
      cors,
    )
  }

  const { count: stored } = await admin
    .from('ingredients')
    .select('id', { count: 'exact', head: true })

  return json({ ok: true, pages, fetched, written, total, stored }, 200, cors)
})
