import { supabase } from '../lib/supabase'
import type { ScanRow } from './scan'

/**
 * Match a label's ingredients against the register.
 *
 * One call for the whole list. Thirty ingredients would otherwise be thirty
 * round trips over a phone connection, and a scan that takes fifteen seconds is
 * a scan nobody uses twice.
 *
 * `country` decides which market's rules come back. It matters: the register
 * compares eleven jurisdictions, and showing a Chinese prohibition to a customer
 * in Seoul as though it applied to them would simply be false.
 */
export async function matchIngredients(
  names: string[],
  country = '한국',
): Promise<{ rows: ScanRow[]; error: string | null }> {
  if (!supabase) return { rows: [], error: '서버에 연결할 수 없습니다' }
  if (names.length === 0) return { rows: [], error: null }

  const { data, error } = await supabase.rpc('scan_ingredients', {
    p_names: names,
    p_country: country,
  })

  if (error) {
    console.error('[skinverse] 성분 대조 실패', error.message)
    return { rows: [], error: '성분을 대조하지 못했습니다. 잠시 후 다시 시도해주세요.' }
  }

  const rows = ((data ?? []) as Record<string, unknown>[]).map((r): ScanRow => ({
    inputName: String(r.input_name ?? ''),
    status: (r.status as ScanRow['status']) ?? 'unknown',
    korName: (r.kor_name as string | null) ?? null,
    engName: (r.eng_name as string | null) ?? null,
    role: (r.role as string | null) ?? null,
    blurb: (r.blurb as Record<string, string> | null) ?? null,
    origin: (r.origin as string | null) ?? null,
    score: r.score === null || r.score === undefined ? null : Number(r.score),
    candidates: Array.isArray(r.candidates)
      ? (r.candidates as Record<string, unknown>[]).map((c) => ({
          korName: String(c.korName ?? ''),
          engName: (c.engName as string | null) ?? null,
          role: (c.role as string | null) ?? null,
          score: Number(c.score ?? 0),
        }))
      : [],
    restrictions: Array.isArray(r.restrictions)
      ? (r.restrictions as Record<string, unknown>[]).map((x) => ({
          country: (x.country as string | null) ?? null,
          category: (x.category as string | null) ?? null,
          limitText: (x.limitText as string | null) ?? null,
          provision: (x.provision as string | null) ?? null,
          noticeName: (x.noticeName as string | null) ?? null,
        }))
      : [],
  }))

  return { rows, error: null }
}

/**
 * Read the ingredient list off a photo.
 *
 * The recognition itself happens in an edge function, for two reasons that are
 * not about convenience: the OCR provider's key must not reach a browser, and
 * the photo must not be stored. The function forwards the image, takes the text,
 * and keeps neither.
 *
 * Until a provider key is configured this returns `notConfigured`, and the screen
 * offers the typed path instead. That is deliberate — a photo button that fails
 * silently teaches customers the feature is broken.
 */
/**
 * The edge function speaks ASCII codes; the Korean is written here.
 *
 * Deliberate, and not only for layering: that function's source travels as a
 * transcribed payload, and Korean in it has been corrupted in transit before —
 * in the error strings, which are exactly the strings nobody reads until
 * something has already gone wrong.
 */
const OCR_ERRORS: Record<string, string> = {
  not_configured: '사진 인식이 아직 준비되지 않았습니다. 아래에 전성분을 직접 입력해주세요.',
  members_only: '로그인이 필요합니다.',
  bad_image: '이미지를 읽을 수 없습니다. 다시 촬영해주세요.',
  too_large: '사진이 너무 큽니다. 다시 촬영해주세요.',
  no_text: '글자를 찾지 못했습니다. 전성분 부분이 선명하게 보이도록 다시 촬영해주세요.',
  ocr_failed: '사진에서 글자를 읽지 못했습니다.',
  bad_request: '요청이 잘못되었습니다.',
  method_not_allowed: '요청이 잘못되었습니다.',
}

export async function readLabelPhoto(
  dataUrl: string,
): Promise<{ text: string; error: string | null; notConfigured: boolean }> {
  if (!supabase) return { text: '', error: '서버에 연결할 수 없습니다', notConfigured: false }

  const { data, error } = await supabase.functions.invoke('label-ocr', {
    body: { image: dataUrl },
  })

  if (error) {
    /*
     * A non-2xx makes supabase-js throw before parsing, but the body holds the
     * code — and 'no provider configured' needs a different answer from 'the
     * photo could not be read'. The first sends the customer to the text box;
     * the second sends them back to the camera.
     */
    const res = (error as { context?: Response }).context
    if (res && typeof res.json === 'function') {
      try {
        const row = (await res.json()) as Record<string, unknown>
        const code = String(row.error ?? '')
        return {
          text: '',
          error: OCR_ERRORS[code] ?? '사진에서 글자를 읽지 못했습니다.',
          notConfigured: code === 'not_configured',
        }
      } catch {
        // Not JSON; fall through to the generic message.
      }
    }
    console.error('[skinverse] 라벨 인식 실패', error.message)
    return { text: '', error: '사진에서 글자를 읽지 못했습니다.', notConfigured: false }
  }

  const row = (data ?? {}) as Record<string, unknown>
  if (row.ok !== true) {
    const code = String(row.error ?? '')
    return {
      text: '',
      error: OCR_ERRORS[code] ?? '사진에서 글자를 읽지 못했습니다.',
      notConfigured: code === 'not_configured',
    }
  }
  return { text: String(row.text ?? ''), error: null, notConfigured: false }
}
