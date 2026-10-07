import type { Lang } from '../data/types'
import type { CatalogProduct } from './types'

/**
 * What a product is still missing before it should go on sale.
 *
 * The catalogue is loaded from a supplier sheet in pieces — prices first, then
 * photographs, then the maker's own detail pages, then an ingredient list
 * somebody has actually checked. Thirty-one products each missing a different
 * subset of that is not something anyone can hold in their head, so the shop's
 * own idea of "ready" is written down here, once, and the operator screen
 * reads it rather than re-deciding.
 */
export type Gap =
  /** Nobody has checked the ingredient list against the maker's own label. */
  | 'ingredients'
  /** No 4-language 한 줄 설명 / 추천 이유. */
  | 'copy'
  /** No product photograph; the shelf tile paints a gradient. */
  | 'photo'
  /** `name` is still the Korean name, so an invoice would be in Korean. */
  | 'nameEn'
  /** None of the maker's long-form detail artwork. */
  | 'detail'
  /** Nothing to ship. */
  | 'stock'
  /** No price, so the product cannot be sold at any figure. */
  | 'price'

export const gapLabels: Record<Gap, string> = {
  ingredients: '전성분 미확인',
  copy: '설명 없음',
  photo: '대표사진 없음',
  nameEn: '영문명 없음',
  detail: '상세페이지 없음',
  stock: '재고 0',
  price: '가격 미입력',
}

/**
 * The gaps the database itself refuses to let past.
 *
 * Only one now. `products_priced_when_active` is a CHECK constraint, so a
 * product cannot go on sale for nothing however the request is sent.
 *
 * An unverified ingredient list used to be here too. It is not any more: a
 * listing with a name, a price and a photograph makes no claim that could be
 * wrong, and refusing to sell it protected nobody. What the database still
 * refuses is the claim itself — `products_no_unverified_claims` means an
 * unchecked product may carry no ingredient list and no analysis at all. So
 * 'ingredients' stays on this list as something to go and do, and stops being
 * a reason the sale is blocked.
 */
export const BLOCKING: Gap[] = ['price']

const LANGS: Lang[] = ['ko', 'en', 'zh', 'th']

const hasAllLangs = (l: Partial<Record<Lang, string>> | undefined): boolean =>
  LANGS.every((k) => Boolean(l?.[k]?.trim()))

/**
 * A name is "English" when it is not the Korean one we fell back to.
 *
 * Checked by script rather than by flag because the fallback is invisible in
 * the data: both cases are just a string in `name`. A name that still equals
 * `name_l.ko` is one nobody has replaced.
 */
const needsEnglishName = (p: CatalogProduct): boolean =>
  !p.name.trim() || p.name.trim() === p.nameL?.ko?.trim() || /[가-힣]/.test(p.name)

export function gapsOf(p: CatalogProduct): Gap[] {
  const gaps: Gap[] = []
  if (!p.checked) gaps.push('ingredients')
  if (needsEnglishName(p)) gaps.push('nameEn')
  if (!hasAllLangs(p.sub) || !hasAllLangs(p.why)) gaps.push('copy')
  if (!p.img.trim()) gaps.push('photo')
  if (!p.detail || Object.keys(p.detail.pages ?? {}).length === 0) gaps.push('detail')
  if (p.stock <= 0) gaps.push('stock')
  if (!(p.priceKrw > 0)) gaps.push('price')
  return gaps
}

/** Whether the database will accept `active = true` for this product. */
export function canSell(p: CatalogProduct): boolean {
  return p.priceKrw > 0
}

/** Why the database would refuse to put this product on sale, if it would. */
export function saleBlockers(p: CatalogProduct): Gap[] {
  return gapsOf(p).filter((g) => BLOCKING.includes(g))
}
