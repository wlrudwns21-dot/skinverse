import { s } from '../../lib/css'

/**
 * Marks a view that is not yet wired to Postgres.
 *
 * Only the CS queue is left: orders, members, the catalogue, missions and the
 * point rules all persist now. Saying so on the screen beats letting an
 * operator believe a change stuck when it will vanish on refresh.
 */
export function LocalOnlyNotice({ what }: { what: string }) {
  return (
    <div style={s('background:#FBF3E4;border:1px solid #EBD9B8;border-radius:12px;padding:11px 14px;margin-top:12px;font-size:12px;color:#9A8455;line-height:1.55')}>
      <b>이 화면은 아직 저장되지 않습니다.</b> {what}은(는) 코드의 샘플 데이터를 읽고 있어,
      여기서 바꾼 값은 새로고침하면 되돌아갑니다.
    </div>
  )
}
