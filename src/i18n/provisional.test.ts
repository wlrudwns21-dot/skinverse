import { describe, expect, it } from 'vitest'
import { ko } from '../i18n/ko'
import { en } from '../i18n/en'
import { zh } from '../i18n/zh'
import { th } from '../i18n/th'

describe('the provisional-price wording', () => {
  it('exists in every language the shop speaks', () => {
    for (const [name, t] of [['ko', ko], ['en', en], ['zh', zh], ['th', th]] as const) {
      expect(t.provisionalPrice, name).toBeTruthy()
      expect(t.provisionalNote, name).toBeTruthy()
      // The badge sits in a tile beside a price — long enough to read, short
      // enough not to wrap the row.
      expect(t.provisionalPrice.length, `${name} badge`).toBeLessThanOrEqual(24)
      /*
       * The note has to explain, not repeat the badge. A raw character floor
       * is the wrong test for that: Chinese says in 40 characters what English
       * needs 180 for, and the first version of this failed the Chinese note
       * for being dense rather than for being thin. Measuring the note against
       * its own badge asks the question in a way every script answers the same.
       */
      expect(t.provisionalNote, `${name} note`).not.toBe(t.provisionalPrice)
      expect(
        t.provisionalNote.length / t.provisionalPrice.length,
        `${name} note vs badge`,
      ).toBeGreaterThan(3)
    }
  })
})
