import { s } from '../../lib/css'

/**
 * Marks the views that are not yet wired to Postgres.
 *
 * Orders and members come from the database and persist. The catalogue, the
 * mission configuration and the CS queue still read from `src/data/`, so edits
 * made here last only as long as the tab is open. Saying so on the screen beats
 * letting an operator believe a stock change stuck.
 */
export function LocalOnlyNotice({ what }: { what: string }) {
  return (
    <div style={s('background:#FBF3E4;border:1px solid #EBD9B8;border-radius:12px;padding:11px 14px;margin-top:12px;font-size:12px;color:#9A8455;line-height:1.55')}>
      <b>이 화면은 아직 저장되지 않습니다.</b> {what}은(는) 코드의 샘플 데이터를 읽고 있어,
      여기서 바꾼 값은 새로고침하면 되돌아갑니다.
    </div>
  )
}
