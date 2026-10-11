import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * A test over a stylesheet, which is unusual, so: why.
 *
 * `word-break: keep-all` on `body` is the single most plausible thing for
 * someone to re-add. It reads as obviously correct — it stops Korean breaking
 * mid-word, and every screen here is Korean first — and in Chromium it looks
 * fine afterwards, because Chromium force-breaks an overlong line rather than
 * letting it overflow.
 *
 * WebKit does not. On an iPhone the rule turned every Chinese paragraph into
 * one unbreakable token, the document grew to several times the viewport, and
 * Safari zoomed the page out to fit: the whole storefront rendered as a narrow
 * strip down the left of the screen. It shipped, and the only reason we found
 * it is that someone opened the Chinese site on a phone.
 *
 * Nothing in the type system or the test suite can see a CSS rule, and the
 * browser we drive locally is the one that hides the bug. So the rule itself
 * gets pinned: keep-all is allowed, but only inside a Korean scope.
 */

const CSS = readFileSync(join(import.meta.dirname, 'global.css'), 'utf8')

/** Strip comments so the prose about keep-all is not mistaken for the rule. */
const code = CSS.replace(/\/\*[\s\S]*?\*\//g, '')

describe('word-break: keep-all stays scoped to Korean', () => {
  it('is used at all — Korean needs it', () => {
    expect(code).toContain('word-break: keep-all')
  })

  it('appears only in a Korean-scoped rule', () => {
    // Every selector block that sets keep-all has to name Korean.
    const blocks = [...code.matchAll(/([^{}]+)\{([^}]*)\}/g)]
    const offenders = blocks
      .filter(([, , body]) => /word-break:\s*keep-all/.test(body))
      .map(([, selector]) => selector.trim().replace(/\s+/g, ' '))

    expect(offenders.length).toBeGreaterThan(0)
    for (const sel of offenders) {
      expect(sel, `"${sel}" sets keep-all for every language`).toContain("data-lang='ko'")
    }
  })

  it('leaves a backstop for a single unbreakable token', () => {
    // A sixty-character INCI name in a Korean paragraph still has to break
    // rather than push the page sideways, and keep-all alone would let it.
    expect(code).toMatch(/overflow-wrap:\s*break-word/)
  })

  it('ships the Korean scope in the HTML, not only from JavaScript', () => {
    // The attribute is set again on mount, but if it only existed there a
    // Korean reader would get a frame of mid-word breaking on every load.
    const html = readFileSync(join(import.meta.dirname, '../../index.html'), 'utf8')
    expect(html).toMatch(/<html[^>]*data-lang="ko"/)
  })
})
