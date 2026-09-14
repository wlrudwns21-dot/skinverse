/**
 * Korean subject and topic particles, chosen correctly.
 *
 * Which particle a noun takes depends on whether its last syllable ends in a
 * consonant: 수분 ends in ㄴ and takes 이/은, 민감도 ends in a vowel and takes
 * 가/는. Templates that cannot tell fall back to writing "수분이(가)", which is
 * how forms and error messages are written, not how a person writes — and this
 * app puts these words in sentences about someone's face.
 *
 * Hangul syllables are laid out so the final consonant is recoverable
 * arithmetically: the block runs from U+AC00, and every 28th code point starts
 * a new lead/vowel pair with no final consonant.
 */

const HANGUL_START = 0xac00
const HANGUL_END = 0xd7a3
const FINALS = 28

/** Does this word's last syllable end in a consonant? */
export function hasFinalConsonant(word: string): boolean {
  const last = word.trimEnd().slice(-1)
  if (!last) return false

  const code = last.charCodeAt(0)
  if (code >= HANGUL_START && code <= HANGUL_END) {
    return (code - HANGUL_START) % FINALS !== 0
  }

  // A digit read aloud in Korean ends the way its name does: 1 (일), 3 (삼),
  // 6 (육), 7 (칠), 8 (팔), 0 (영) end in a consonant; 2 (이), 4 (사), 5 (오),
  // 9 (구) do not.
  if (last >= '0' && last <= '9') return '136780'.includes(last)

  // Latin and everything else: assume a consonant, which is the commoner case
  // and the reading most Korean style guides default to.
  return true
}

/** 이 / 가 — the subject particle. */
export const sub = (word: string) => word + (hasFinalConsonant(word) ? '이' : '가')

/** 은 / 는 — the topic particle. */
export const top = (word: string) => word + (hasFinalConsonant(word) ? '은' : '는')

/** 을 / 를 — the object particle. */
export const obj = (word: string) => word + (hasFinalConsonant(word) ? '을' : '를')
