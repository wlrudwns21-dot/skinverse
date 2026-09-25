import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsFor } from './cors.ts'

/**
 * Mirror the MFDS cosmetic-ingredient registers into our own tables.
 *
 * Two datasets from the public data portal, both licensed without restriction:
 *
 *   ingredients  15111774  every registered ingredient, by name
 *   restricted   15111772  the ones with a legal limit, or forbidden outright
 *
 * The first answers "is this a real ingredient name, and what is it called".
 * The second answers "has the Ministry placed a limit on it". Only together are
 * they worth anything: a label is a list of names, and a name on its own says
 * nothing.
 *
 * Why a copy and not a live lookup: reading one product label means matching
 * twenty or thirty names, and each dataset allows 10,000 calls a day for the
 * whole site. They change a few times a year, so a nightly-at-most sync loses
 * nothing - and a government API being slow must not make a product page slow
 * with it.
 *
 * Only operators may start a sync, and the API key lives in this function's
 * secrets. It is never sent to a browser.
 *
 * -- Why no message in this file is written in Korean ------------------------
 *
 * Every message leaves here as an ASCII code and is turned into Korean by the
 * console. That is not only good layering: this file reaches the platform as a
 * transcribed payload, and Korean written that way has already been corrupted
 * once - silently, in the error strings, which are exactly the strings nobody
 * reads until something has gone wrong.
 *
 * The two literals that must be compared against the portal's own Korean are
 * escaped (see NOT_APPLICABLE and KEY_FAULT), so no behaviour of this file
 * depends on a multi-byte character surviving the trip. Keep new messages out.
 */

/** Rows per request. The portal accepts 1,000 on these services. */
const PAGE_SIZE = 1000

/**
 * A hard stop, in pages.
 *
 * These registers hold tens of thousands of rows, not millions. If the loop is
 * still going after this many pages then something is wrong with the paging -
 * a service that ignores `pageNo` would otherwise return page one for ever and
 * burn the whole daily quota on it.
 */
const MAX_PAGES = 200

interface Row {
  kor_name: string
  match_key: string
  [column: string]: unknown
}

interface Dataset {
  /** Our table. */
  table: string
  /** `on conflict` target, matching the table's unique index. */
  conflict: string
  /**
   * Addresses to try, best first.
   *
   * The portal names a service and an operation separately, so a full URL
   * cannot be derived from either alone - and the two registers do not even
   * agree with each other: the ingredient service's operation carries the '01'
   * suffix, the restriction service's does not. Both heads below were settled
   * by probing the portal with a deliberately invalid key, which answers
   * SERVICE_KEY_IS_NOT_REGISTERED_ERROR for an address that exists and
   * NO_OPENAPI_SERVICE_ERROR for one that does not.
   *
   * The rest are kept as a fallback rather than deleted, because the portal has
   * renamed service paths before and a rename should cost a retry, not an
   * outage.
   */
  candidates: string[]
  /** Overrides the candidates entirely, for pasting an address without a deploy. */
  urlSecret: string
  /** Turn one API record into one of our rows, or null to skip it. */
  map: (r: Record<string, unknown>) => Row | null
}

/*
 * The handful of Korean strings this file must contain, escaped.
 *
 * These are not messages - they are literals compared against what the portal
 * sends back, so they cannot be moved to the console with the rest. They are
 * written as escapes so that this file stays pure ASCII end to end, for the
 * reason given at the top: Korean transcribed into this file has been silently
 * corrupted before, and a corrupted comparison literal fails quietly.
 */
/** The portal's way of writing "not applicable". */
const NOT_APPLICABLE = '\uD574\uB2F9\uC5C6\uC74C'
/**
 * Words that mark a key or quota fault, not a bad address.
 *
 * The distinction is load-bearing: a key fault stops the search, because trying
 * three more addresses with a bad key just produces three more identical
 * errors. A missing address does not stop it, because the next candidate is the
 * whole point. The portal is explicit about which is which -
 * SERVICE_KEY_IS_NOT_REGISTERED_ERROR against NO_OPENAPI_SERVICE_ERROR - and
 * only the former matches here.
 */
const KEY_FAULT = /SERVICE_KEY|LIMITED_NUMBER|EXCEED|\uC778\uC99D\uD0A4|\uD55C\uB3C4 \uCD08\uACFC/i

/** Trim, and treat the portal's several spellings of "nothing" as nothing. */
function clean(v: unknown): string | null {
  if (typeof v === 'number') return String(v)
  if (typeof v !== 'string') return null
  const t = v.trim()
  if (!t || t === '-' || t === 'null' || t === NOT_APPLICABLE) return null
  return t
}

/**
 * The first of these keys the record actually has.
 *
 * 15111774's field names are known from its response preview. 15111772's are
 * not - it could not be reached from the build environment - so its mapping is
 * a list of plausible names rather than one certain name, and every record is
 * stored whole in `raw` besides. A wrong guess therefore costs a re-read of our
 * own table, not another sync against the daily quota. The reply carries the
 * field names actually seen, so the guessing ends after one run.
 */
function pick(r: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = clean(r[k])
    if (v !== null) return v
  }
  return null
}

const NAME_KEYS = ['INGR_KOR_NAME', 'KOR_NAME', 'INGR_NAME', 'MTRAL_NM', 'NAME_KOR']
const ENG_KEYS = ['INGR_ENG_NAME', 'ENG_NAME', 'INGR_ENG_NM', 'NAME_ENG']
const CAS_KEYS = ['CAS_NO', 'CAS_NUM', 'CASNO']

const DATASETS: Record<string, Dataset> = {
  ingredients: {
    table: 'ingredients',
    conflict: 'kor_name,cas_no',
    urlSecret: 'MFDS_INGREDIENT_URL',
    candidates: [
      // Confirmed: this service's operation does carry the '01'.
      'https://apis.data.go.kr/1471000/CsmtcsIngdCpntInfoService01/getCsmtcsIngdCpntInfoService01',
      'https://apis.data.go.kr/1471000/CsmtcsIngdCpntInfoService/getCsmtcsIngdCpntInfoService01',
      'https://apis.data.go.kr/1471000/CsmtcsIngdCpntInfoService01/getCsmtcsIngdCpntInfoService',
    ],
    map(r) {
      // Without a Korean name there is nothing to match a label against, so the
      // row cannot serve its only purpose. Skipped rather than stored blank.
      const kor = pick(r, NAME_KEYS)
      if (!kor) return null
      return {
        kor_name: kor,
        // Overwritten by the table's trigger. Present because the column is
        // NOT NULL and PostgREST builds its column list from the payload keys.
        match_key: '',
        eng_name: pick(r, ENG_KEYS),
        cas_no: pick(r, CAS_KEYS),
        origin: pick(r, ['ORIGIN_MAJOR_KOR_NAME', 'ORIGIN_KOR_NAME', 'ORIGIN']),
        synonym: pick(r, ['INGR_SYNONYM', 'SYNONYM', 'OTHR_NM']),
        source: 'mfds',
      }
    },
  },

  restricted: {
    table: 'restricted_ingredients',
    conflict: 'kor_name,category,cas_no',
    urlSecret: 'MFDS_RESTRICTED_URL',
    candidates: [
      // Confirmed. Note the absent '01' - the sibling service has it, this one
      // does not, and assuming otherwise costs a wasted call on every sync.
      'https://apis.data.go.kr/1471000/CsmtcsUseRstrcInfoService/getCsmtcsUseRstrcInfoService',
      'https://apis.data.go.kr/1471000/CsmtcsUseRstrcInfoService/getCsmtcsUseRstrcInfoService01',
      'https://apis.data.go.kr/1471000/CsmtcsUseRstrcInfoService01/getCsmtcsUseRstrcInfoService01',
    ],
    map(r) {
      const kor = pick(r, NAME_KEYS)
      if (!kor) return null
      return {
        kor_name: kor,
        match_key: '',
        eng_name: pick(r, ENG_KEYS),
        cas_no: pick(r, CAS_KEYS),
        // Which list the entry is on, in the register's own words.
        category: pick(r, ['USE_RSTRC_SE', 'RSTRC_SE', 'SE_NM', 'GUBUN', 'DIV_NM', 'USE_SE']),
        // The permitted concentration, as text, because that is what it is.
        limit_text: pick(r, ['USE_LIMIT', 'LIMIT_CNTNT', 'USE_LMT', 'CNCNTR_LIMIT', 'LIMIT']),
        // Other conditions: "not for use in products for infants" lives here.
        other_text: pick(r, ['ETC_RSTRC', 'ETC_CNTNT', 'OTHER_RSTRC', 'RSTRC_CNTNT', 'ETC']),
        raw: r,
      }
    },
  },
}

const json = (body: unknown, status: number, cors: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })

/**
 * The portal issues the same key twice: decoded, and percent-encoded.
 *
 * `URLSearchParams` encodes once, so it needs the decoded form. Handed the
 * encoded one it would escape the `%` signs as well, and the portal would be
 * asked about a key that does not exist - which it reports as an unregistered
 * key, sending whoever reads that off to check their registration instead of
 * their clipboard. Cheaper to undo here than to explain.
 */
function normaliseKey(raw: string): { key: string; wasEncoded: boolean } {
  const k = raw.trim()
  if (/%[0-9A-Fa-f]{2}/.test(k)) {
    try {
      return { key: decodeURIComponent(k), wasEncoded: true }
    } catch {
      return { key: k, wasEncoded: false }
    }
  }
  return { key: k, wasEncoded: false }
}

interface Page {
  rows: Row[]
  total: number
  /** The field names the API actually used, from the first record of the page. */
  fields: string[]
  /** How many records arrived, including any the mapper skipped. */
  received: number
}

/**
 * One page of a register, from one specific address.
 *
 * The service answers XML by default and JSON on request. JSON is asked for,
 * but a failure there is reported rather than parsed around: the portal signals
 * a bad key or an exceeded quota by returning an XML fault *with* HTTP 200, so
 * a body that will not parse as JSON is far more likely to be an error document
 * than a success worth salvaging.
 */
async function fetchPage(
  ds: Dataset,
  endpoint: string,
  key: string,
  pageNo: number,
): Promise<Page> {
  const url = new URL(endpoint)
  url.searchParams.set('serviceKey', key)
  url.searchParams.set('pageNo', String(pageNo))
  url.searchParams.set('numOfRows', String(PAGE_SIZE))
  url.searchParams.set('type', 'json')

  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  const text = await res.text()

  // A fault arrives as 400 or 403 with the reason in the body, so the body is
  // carried into the message rather than the status alone: 'HTTP 403' on its own
  // does not distinguish a bad key from a retired service, and the two call for
  // opposite responses.
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`)

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    // An XML fault: SERVICE_KEY_IS_NOT_REGISTERED_ERROR,
    // LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR and friends. Pass the
    // portal's own words through - they name the problem precisely, and the
    // console shows them verbatim rather than guessing at a translation.
    const m = /<returnAuthMsg>([^<]*)<|<resultMsg>([^<]*)<|<errMsg>([^<]*)</.exec(text)
    const said = m?.[1] ?? m?.[2] ?? m?.[3]
    throw new Error(said ? `portal said: ${said}` : `not JSON: ${text.slice(0, 160)}`)
  }

  const root = parsed as Record<string, Record<string, unknown>>
  const nested = parsed as Record<string, Record<string, Record<string, unknown>>>

  // A fault can also arrive as JSON with HTTP 200, under its own envelope.
  const fault = (root?.OpenAPI_ServiceResponse as Record<string, unknown> | undefined)
    ?.cmmMsgHeader as Record<string, unknown> | undefined
  if (fault) {
    throw new Error(
      `${clean(fault.errMsg) ?? 'portal fault'}: ${clean(fault.returnAuthMsg) ?? ''}`,
    )
  }

  const body = root?.body ?? nested?.response?.body
  const header = root?.header ?? nested?.response?.header

  const code = clean(header?.resultCode)
  if (code && code !== '00') {
    throw new Error(`portal code ${code}: ${clean(header?.resultMsg) ?? ''}`)
  }
  if (!body) throw new Error(`no body: ${text.slice(0, 160)}`)

  // `items` arrives as an array, as `{item: [...]}`, or - for a single result -
  // as a bare object. All three shapes are real.
  const items = body.items as unknown
  const list: unknown[] = Array.isArray(items)
    ? items
    : Array.isArray((items as Record<string, unknown>)?.item)
      ? ((items as Record<string, unknown>).item as unknown[])
      : items && typeof items === 'object'
        ? [(items as Record<string, unknown>).item ?? items]
        : []

  const rows: Row[] = []
  for (const entry of list) {
    const mapped = ds.map(entry as Record<string, unknown>)
    if (mapped) rows.push(mapped)
  }

  const first = list[0]
  const total = Number(clean(body.totalCount) ?? 0)
  return {
    rows,
    total: Number.isFinite(total) ? total : 0,
    fields: first && typeof first === 'object' ? Object.keys(first as object) : [],
    received: list.length,
  }
}

/**
 * Find the address that answers, and return its first page with it.
 *
 * The page is carried back rather than discarded because resolving costs a real
 * request against a 10,000-a-day budget, and re-fetching the same page to keep
 * the code tidier would be paying for tidiness with quota.
 *
 * A key or quota problem is not an address problem: those stop the search
 * immediately instead of being retried against every candidate, which would
 * turn one clear error into three confusing ones.
 */
async function resolve(
  ds: Dataset,
  key: string,
  pageNo: number,
): Promise<{ endpoint: string; first: Page }> {
  const override = Deno.env.get(ds.urlSecret)?.trim()
  const list = override ? [override] : ds.candidates
  const tried: string[] = []

  for (const url of list) {
    try {
      return { endpoint: url, first: await fetchPage(ds, url, key, pageNo) }
    } catch (e) {
      const why = e instanceof Error ? e.message : String(e)
      tried.push(`${url} -> ${why}`)
      if (KEY_FAULT.test(why)) {
        throw new Error(`KEY_OR_QUOTA ${why}`)
      }
    }
  }

  throw new Error(`NO_ADDRESS_ANSWERED ${tried.join(' | ')}`)
}

Deno.serve(async (req) => {
  const cors = corsFor(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, cors)

  const rawKey = Deno.env.get('DATA_GO_KR_KEY') ?? ''
  if (!rawKey.trim()) return json({ error: 'not_configured' }, 503, cors)
  const { key, wasEncoded } = normaliseKey(rawKey)

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  )

  // An active operator, identified by the email inside their own verified
  // token. A sync spends a chunk of the day's quota and rewrites a table every
  // customer reads, so it is not something a logged-in customer may do.
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

  let body: { dataset?: string; pages?: number; from?: number } = {}
  try {
    body = (await req.json()) as typeof body
  } catch {
    // No body means the ingredient register, everything, from the start.
  }

  const ds = DATASETS[body.dataset ?? 'ingredients']
  if (!ds) return json({ error: 'unknown_dataset' }, 400, cors)

  // `pages` exists so a first run can be one page: proving the key works and
  // seeing what the data really looks like should not cost a full sync.
  const pageLimit = Number.isFinite(body.pages) && (body.pages as number) > 0
    ? Math.min(Math.floor(body.pages as number), MAX_PAGES)
    : MAX_PAGES
  const firstPage = Number.isFinite(body.from) && (body.from as number) > 0
    ? Math.floor(body.from as number)
    : 1

  let written = 0
  let fetched = 0
  let received = 0
  let total = 0
  let pages = 0
  let endpoint = ''
  let fields: string[] = []

  try {
    const found = await resolve(ds, key, firstPage)
    endpoint = found.endpoint

    let page = found.first
    for (let i = 0; i < pageLimit; i++) {
      const pageNo = firstPage + i
      if (i > 0) page = await fetchPage(ds, endpoint, key, pageNo)
      pages++
      if (page.total) total = page.total
      if (fields.length === 0) fields = page.fields
      fetched += page.rows.length
      received += page.received

      if (page.rows.length > 0) {
        /*
         * Upsert on the register's own notion of identity. `blurb` is absent
         * from the payload and therefore from the update: that copy is ours,
         * written for customers, and a re-sync must not wipe it.
         */
        const { error, count } = await admin
          .from(ds.table)
          .upsert(
            page.rows.map((r) => ({ ...r, synced_at: new Date().toISOString() })),
            { onConflict: ds.conflict, ignoreDuplicates: false, count: 'exact' },
          )
        if (error) throw new Error(`STORE_FAILED page ${pageNo}: ${error.message}`)
        written += count ?? page.rows.length
      }

      // Every record the register says it has, seen.
      if (total && firstPage === 1 && received >= total) break
      // A short page is the last page. Judged on records received, not rows
      // kept: a page where the mapper skipped everything is still a full page,
      // and stopping there would silently truncate the sync.
      if (page.received < PAGE_SIZE) break
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('mfds sync failed', message)
    // Partial progress is reported rather than discarded: the rows already
    // upserted are in the table, and the caller needs to know where to resume.
    return json(
      {
        error: 'sync_failed',
        message,
        dataset: body.dataset ?? 'ingredients',
        endpoint,
        fields,
        keyWasEncoded: wasEncoded,
        pages,
        fetched,
        received,
        written,
        total,
        resumeFrom: firstPage + pages,
      },
      502,
      cors,
    )
  }

  const { count: stored } = await admin
    .from(ds.table)
    .select('id', { count: 'exact', head: true })

  return json(
    {
      ok: true,
      dataset: body.dataset ?? 'ingredients',
      endpoint,
      fields,
      keyWasEncoded: wasEncoded,
      pages,
      fetched,
      received,
      written,
      total,
      stored: stored ?? 0,
    },
    200,
    cors,
  )
})
