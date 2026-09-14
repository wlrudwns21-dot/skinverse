import type { CSSProperties } from 'react'

/**
 * Turn a raw CSS declaration string into a React style object.
 *
 * The design handoff (`project/*.dc.html`) expresses every rule as an inline
 * `style="..."` string. Keeping those strings verbatim is what makes this port
 * pixel-identical to the prototype — hand-converting ~700 declaration blocks to
 * camelCased objects would have been the one place visual drift crept in. So we
 * parse them at runtime instead, and memoise by string so each block is parsed
 * exactly once for the life of the page.
 *
 *   <div style={s('display:flex;gap:8px')} />
 *   <div style={s(`width:${pct};background:${color}`)} />
 */
const cache = new Map<string, CSSProperties>()

export function s(text: string): CSSProperties {
  const hit = cache.get(text)
  if (hit) return hit

  const out: Record<string, string> = {}
  for (const decl of splitDeclarations(text)) {
    const colon = decl.indexOf(':')
    if (colon === -1) continue
    const prop = decl.slice(0, colon).trim()
    const value = decl.slice(colon + 1).trim()
    if (!prop || !value) continue
    out[toCamel(prop)] = value
  }

  const style = out as unknown as CSSProperties
  cache.set(text, style)
  return style
}

/**
 * Split on top-level `;` only — values like `linear-gradient(150deg,#DDEAE3,#8FBCA6)`
 * and `ellipse(50% 50% at 50% 50%)` carry their own punctuation inside parens.
 */
function splitDeclarations(text: string): string[] {
  const parts: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '(') depth++
    else if (ch === ')') depth--
    else if (ch === ';' && depth === 0) {
      parts.push(text.slice(start, i))
      start = i + 1
    }
  }
  parts.push(text.slice(start))
  return parts
}

/** `background-color` → `backgroundColor`, `-webkit-mask` → `WebkitMask`. */
function toCamel(prop: string): string {
  if (prop.startsWith('--')) return prop
  const vendor = prop.startsWith('-')
  const body = vendor ? prop.slice(1) : prop
  const camel = body.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
  return vendor ? camel.charAt(0).toUpperCase() + camel.slice(1) : camel
}
