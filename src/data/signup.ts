import type { Localized } from './types'

/**
 * What a customer tells us when they join, and the rules for it.
 *
 * The store ships worldwide, so none of this can assume Korea: a phone number
 * without a dialling code is unreachable from anywhere else, and a postcode
 * format that insists on five digits rejects half the addresses on earth. Every
 * check here is therefore deliberately loose — enough to catch a slip, never
 * enough to lock out a real customer whose country writes things differently.
 */

// ── dialling codes ──────────────────────────────────────────────────────────

export interface DialCode {
  /** ISO 3166-1 alpha-2, used as the key and for the flag. */
  iso: string
  /** With the leading +, because that is how a customer reads it. */
  code: string
  name: Localized
}

/**
 * The markets the store actually ships to, in the order the shipping form
 * lists them, so a customer meets the same countries in both places.
 */
export const dialCodes: DialCode[] = [
  { iso: 'KR', code: '+82', name: { ko: '대한민국', en: 'South Korea', zh: '韩国', th: 'เกาหลีใต้' } },
  { iso: 'JP', code: '+81', name: { ko: '일본', en: 'Japan', zh: '日本', th: 'ญี่ปุ่น' } },
  { iso: 'CN', code: '+86', name: { ko: '중국', en: 'China', zh: '中国', th: 'จีน' } },
  { iso: 'HK', code: '+852', name: { ko: '홍콩', en: 'Hong Kong', zh: '香港', th: 'ฮ่องกง' } },
  { iso: 'TW', code: '+886', name: { ko: '대만', en: 'Taiwan', zh: '台湾', th: 'ไต้หวัน' } },
  { iso: 'SG', code: '+65', name: { ko: '싱가포르', en: 'Singapore', zh: '新加坡', th: 'สิงคโปร์' } },
  { iso: 'MY', code: '+60', name: { ko: '말레이시아', en: 'Malaysia', zh: '马来西亚', th: 'มาเลเซีย' } },
  { iso: 'TH', code: '+66', name: { ko: '태국', en: 'Thailand', zh: '泰国', th: 'ไทย' } },
  { iso: 'VN', code: '+84', name: { ko: '베트남', en: 'Vietnam', zh: '越南', th: 'เวียดนาม' } },
  { iso: 'ID', code: '+62', name: { ko: '인도네시아', en: 'Indonesia', zh: '印度尼西亚', th: 'อินโดนีเซีย' } },
  { iso: 'PH', code: '+63', name: { ko: '필리핀', en: 'Philippines', zh: '菲律宾', th: 'ฟิลิปปินส์' } },
  { iso: 'IN', code: '+91', name: { ko: '인도', en: 'India', zh: '印度', th: 'อินเดีย' } },
  { iso: 'AE', code: '+971', name: { ko: '아랍에미리트', en: 'United Arab Emirates', zh: '阿联酋', th: 'สหรัฐอาหรับเอมิเรตส์' } },
  { iso: 'SA', code: '+966', name: { ko: '사우디아라비아', en: 'Saudi Arabia', zh: '沙特阿拉伯', th: 'ซาอุดีอาระเบีย' } },
  { iso: 'AU', code: '+61', name: { ko: '호주', en: 'Australia', zh: '澳大利亚', th: 'ออสเตรเลีย' } },
  { iso: 'NZ', code: '+64', name: { ko: '뉴질랜드', en: 'New Zealand', zh: '新西兰', th: 'นิวซีแลนด์' } },
  { iso: 'GB', code: '+44', name: { ko: '영국', en: 'United Kingdom', zh: '英国', th: 'สหราชอาณาจักร' } },
  { iso: 'FR', code: '+33', name: { ko: '프랑스', en: 'France', zh: '法国', th: 'ฝรั่งเศส' } },
  { iso: 'DE', code: '+49', name: { ko: '독일', en: 'Germany', zh: '德国', th: 'เยอรมนี' } },
  { iso: 'NL', code: '+31', name: { ko: '네덜란드', en: 'Netherlands', zh: '荷兰', th: 'เนเธอร์แลนด์' } },
  { iso: 'ES', code: '+34', name: { ko: '스페인', en: 'Spain', zh: '西班牙', th: 'สเปน' } },
  { iso: 'IT', code: '+39', name: { ko: '이탈리아', en: 'Italy', zh: '意大利', th: 'อิตาลี' } },
  { iso: 'CH', code: '+41', name: { ko: '스위스', en: 'Switzerland', zh: '瑞士', th: 'สวิตเซอร์แลนด์' } },
  { iso: 'SE', code: '+46', name: { ko: '스웨덴', en: 'Sweden', zh: '瑞典', th: 'สวีเดน' } },
  { iso: 'PL', code: '+48', name: { ko: '폴란드', en: 'Poland', zh: '波兰', th: 'โปแลนด์' } },
  { iso: 'US', code: '+1', name: { ko: '미국', en: 'United States', zh: '美国', th: 'สหรัฐอเมริกา' } },
  { iso: 'CA', code: '+1', name: { ko: '캐나다', en: 'Canada', zh: '加拿大', th: 'แคนาดา' } },
  { iso: 'MX', code: '+52', name: { ko: '멕시코', en: 'Mexico', zh: '墨西哥', th: 'เม็กซิโก' } },
  { iso: 'BR', code: '+55', name: { ko: '브라질', en: 'Brazil', zh: '巴西', th: 'บราซิล' } },
  { iso: 'ZA', code: '+27', name: { ko: '남아프리카공화국', en: 'South Africa', zh: '南非', th: 'แอฟริกาใต้' } },
]

/**
 * The dialling code for a country named on the shipping form.
 *
 * Used to preselect it from the country the customer already chose, so the
 * common case needs no thought. Falls back to Korea, the home market.
 */
export function dialCodeFor(countryName: string): string {
  const match = dialCodes.find((d) => d.name.en.toLowerCase() === countryName.toLowerCase())
  return match?.code ?? '+82'
}

/** `+1` is shared, so the list is keyed by country rather than by code. */
export const dialKey = (d: DialCode) => `${d.iso}${d.code}`

// ── gender ──────────────────────────────────────────────────────────────────

export type Gender = 'female' | 'male' | 'other' | 'undisclosed'

/**
 * Four options, including one that declines to answer.
 *
 * Skincare advice does correlate with sex hormones, so the question earns its
 * place — but it is a question about a person, and a form that makes it
 * unavoidable is a form that decides for them.
 */
export const genders: { key: Gender; label: Localized }[] = [
  { key: 'female', label: { ko: '여성', en: 'Female', zh: '女', th: 'หญิง' } },
  { key: 'male', label: { ko: '남성', en: 'Male', zh: '男', th: 'ชาย' } },
  { key: 'other', label: { ko: '그 외', en: 'Other', zh: '其他', th: 'อื่น ๆ' } },
  { key: 'undisclosed', label: { ko: '밝히지 않음', en: 'Prefer not to say', zh: '不愿透露', th: 'ไม่ระบุ' } },
]

// ── validation ──────────────────────────────────────────────────────────────

/**
 * A phone number, minus its dialling code.
 *
 * Digits, spaces and the punctuation people actually type, then between 6 and
 * 15 digits — 15 is the E.164 maximum including the country code, so this is a
 * generous ceiling rather than a real one. Nothing here knows what a valid
 * number looks like in any particular country, and it should not: the store
 * ships to thirty of them.
 */
export function isPhone(value: string): boolean {
  const trimmed = value.trim()
  if (!/^[\d\s\-().]+$/.test(trimmed)) return false
  const digits = trimmed.replace(/\D/g, '')
  return digits.length >= 6 && digits.length <= 15
}

/** Strip a number down to what gets stored: digits only, no leading zero. */
export function normalisePhone(value: string): string {
  // Many countries write a trunk prefix of 0 that is dropped when the dialling
  // code is used — 010-1234-5678 dialled from abroad is +82 10 1234 5678.
  return value.replace(/\D/g, '').replace(/^0+/, '')
}

/**
 * Old enough to hold an account, young enough to be a person.
 *
 * Thirteen is the floor most consumer services use, and it is also the point
 * below which we would be taking skin measurements from a child. The upper
 * bound only catches typos like a year of 1080.
 */
export const MIN_AGE = 13
export const MAX_AGE = 120

export function ageOn(birth: string, today: Date): number | null {
  const parsed = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birth)
  if (!parsed) return null

  const [, y, m, d] = parsed
  const year = Number(y)
  const month = Number(m)
  const day = Number(d)

  const date = new Date(year, month - 1, day)
  // Rejects 2026-02-30, which Date would silently roll into March.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }
  if (date.getTime() > today.getTime()) return null

  let age = today.getFullYear() - year
  const hadBirthday =
    today.getMonth() > month - 1 ||
    (today.getMonth() === month - 1 && today.getDate() >= day)
  if (!hadBirthday) age -= 1
  return age
}

export function isBirthDate(value: string, today: Date): boolean {
  const age = ageOn(value, today)
  return age !== null && age >= MIN_AGE && age <= MAX_AGE
}

/**
 * Korea's personal customs clearance code (개인통관고유부호).
 *
 * A P followed by twelve digits. Optional everywhere and never required to
 * sign up — a customer who is only here for the analysis has no parcel to
 * clear, and one shopping from outside Korea has no use for it at all. An
 * empty value is therefore valid; only a filled-in one is checked.
 */
export function isCustomsCode(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed === '') return true
  return /^[Pp]\d{12}$/.test(trimmed)
}

export const normaliseCustomsCode = (value: string) => value.trim().toUpperCase()
