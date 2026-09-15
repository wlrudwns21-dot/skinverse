import { useMemo, useState } from 'react'
import type { AdminMember } from '../adminRemote'
import { s } from '../../lib/css'
import { useAdmin } from '../AdminContext'

/**
 * The customer directory.
 *
 * The email column used to show the first eight characters of the member's
 * uuid, because auth.users is not reachable from the browser and nothing had
 * ever joined it to the profile. An operator answering a support thread could
 * not tell who they were looking at. The join now happens in one admin-only
 * function, and this screen is what it is for.
 *
 * The row is the summary; the panel underneath is the account. Signup details
 * and the live profile are shown apart rather than merged, because a member can
 * change any of it afterwards and the difference is frequently the answer —
 * "I registered with the wrong city" reads at a glance when both are present.
 */

const ROW_COLS = 'display:grid;grid-template-columns:1.6fr 0.8fr 0.6fr 0.7fr 0.8fr 0.9fr;gap:8px'

const LANGS: Record<string, string> = { ko: '한국어', en: 'English', zh: '中文', th: 'ไทย' }
const CONDITIONS: Record<string, string> = {
  dehydrated: '수분 부족',
  oily: '지성',
  balanced: '균형',
}

const when = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('ko-KR', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      })
    : '—'

const day = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '—'

/** One labelled value in the detail panel. */
function Field({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div style={s('min-width:0')}>
      <div style={s('font-size:10.5px;color:#A2957F')}>{label}</div>
      <div style={s(`font-size:12.5px;margin-top:2px;word-break:break-all;color:${muted ? '#A2957F' : '#3A3226'}`)}>
        {value}
      </div>
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:10px;padding:12px 14px')}>
      <div style={s('font-size:10.5px;font-weight:700;color:#8A7D6C;letter-spacing:0.08em;margin-bottom:9px')}>
        {title}
      </div>
      <div style={s('display:grid;grid-template-columns:repeat(auto-fit,minmax(112px,1fr));gap:11px')}>
        {children}
      </div>
    </div>
  )
}

/**
 * Signup value beside the current one, and a note when they differ.
 * Silent when they match — the point is the change, not the repetition.
 */
function Changed({ label, from, to }: { label: string; from: string | null; to: string }) {
  const moved = from !== null && from !== to
  return (
    <div style={s('min-width:0')}>
      <div style={s('font-size:10.5px;color:#A2957F')}>{label}</div>
      <div style={s('font-size:12.5px;margin-top:2px;word-break:break-all;color:#3A3226')}>
        {from ?? '—'}
        {moved && <span style={s('color:#B08133')}> → {to}</span>}
      </div>
    </div>
  )
}

function Detail({ m }: { m: AdminMember }) {
  const confirmed = m.emailConfirmedAt !== null

  return (
    <div style={s('background:#F8F5EF;border-radius:12px;padding:13px;margin:0 6px 12px;display:flex;flex-direction:column;gap:10px;animation:riseAdmin .2s ease both')}>
      <Group title="계정">
        <Field label="이메일" value={m.email} />
        <div style={s('min-width:0')}>
          <div style={s('font-size:10.5px;color:#A2957F')}>이메일 인증</div>
          <div style={s(`font-size:12.5px;margin-top:2px;font-weight:700;color:${confirmed ? '#2E6B58' : '#C25E43'}`)}>
            {confirmed ? '완료' : '미인증'}
          </div>
        </div>
        <Field label="가입 방식" value={m.provider === 'email' ? '이메일' : m.provider} />
        <Field label="가입일" value={day(m.created_at)} />
        <Field label="최근 로그인" value={when(m.lastSignInAt)} />
        <Field label="회원 ID" value={m.id} muted />
      </Group>

      {/* What they entered on the form, and where it has since moved. */}
      <Group title="가입 시 입력 정보 → 현재">
        <Changed label="이름" from={m.signup.name} to={m.name} />
        <Changed label="국가" from={m.signup.country} to={m.country} />
        <Changed label="도시" from={m.signup.city} to={m.city} />
        <Changed
          label="언어"
          from={m.signup.language ? (LANGS[m.signup.language] ?? m.signup.language) : null}
          to={LANGS[m.language] ?? m.language}
        />
        <Changed label="타임존" from={m.signup.timezone} to={m.timezone} />
      </Group>

      <Group title="프로필 · 활동">
        <Field label="피부 타입" value={CONDITIONS[m.skinCondition] ?? m.skinCondition} />
        <Field label="포인트" value={m.points.toLocaleString() + ' P'} />
        <Field label="연속 기록" value={m.streak + '일'} />
        <Field label="루틴 알림" value={m.routineReminders ? '받음' : '받지 않음'} />
        <Field label="분석 횟수" value={m.scanCount + '회'} />
        <Field label="최근 분석" value={when(m.lastScanAt)} />
        <Field label="주문" value={m.orderCount + '건'} />
        <Field label="총 구매액" value={'$' + m.totalSpent.toFixed(2)} />
      </Group>
    </div>
  )
}

export function Users() {
  const admin = useAdmin()
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return admin.userList
    // Name or email — the two things an operator arrives holding.
    return admin.userList.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    )
  }, [admin.userList, query])

  return (
    <div style={s('animation:riseAdmin .3s ease both')}>
      <div style={s('display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap')}>
        <div style={s('font-family:Marcellus,serif;font-size:24px')}>회원 관리</div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름 또는 이메일 검색"
          style={s('border:1px solid #D8CFBF;border-radius:999px;padding:8px 14px;font-size:12.5px;background:#FFFFFF;outline:none;min-width:200px')}
        />
      </div>

      {!admin.hasMembers && (
        <div style={s('border:1px dashed #D3C9B7;border-radius:12px;padding:22px;text-align:center;font-size:12.5px;color:#8A7D6C;margin-top:14px;line-height:1.6')}>
          아직 가입한 회원이 없습니다.
          <br />
          스토어에서 회원가입이 이루어지면 여기에 바로 나타납니다.
        </div>
      )}

      <div style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:14px;padding:6px 16px 16px;margin-top:14px;overflow-x:auto')}>
        <div style={s('min-width:760px')}>
          <div style={s(ROW_COLS + ';font-size:11px;color:#8A7D6C;font-weight:700;padding:10px 6px;border-bottom:1px solid #ECE6DA')}>
            <span>회원 / 이메일</span><span>국가</span><span>레벨</span><span>포인트</span><span>분석 / 주문</span><span>포인트 지급</span>
          </div>

          {admin.hasMembers && shown.length === 0 && (
            <div style={s('padding:22px;text-align:center;font-size:12.5px;color:#8A7D6C')}>
              “{query}”와 일치하는 회원이 없습니다.
            </div>
          )}

          {shown.map((u) => {
            const open = openId === u.id
            const unconfirmed = u.record.emailConfirmedAt === null
            return (
              <div key={u.id}>
                <div
                  onClick={() => setOpenId(open ? null : u.id)}
                  style={s(ROW_COLS + `;cursor:pointer;font-size:12.5px;padding:11px 6px;align-items:center;border-bottom:1px solid #F1ECE2;${open ? 'background:#F8F5EF' : ''}`)}
                >
                  <div style={s('min-width:0')}>
                    <b>{u.name}</b>
                    <div style={s('font-size:11px;color:#8A7D6C;word-break:break-all')}>
                      {u.email}
                      {/* An unconfirmed address is the first thing to check when
                          a member says nothing is arriving, so it is on the row
                          rather than one click further in. */}
                      {unconfirmed && (
                        <span style={s('color:#C25E43;font-weight:700')}> · 미인증</span>
                      )}
                    </div>
                  </div>
                  <span>{u.country}</span>
                  <span style={s('background:#EAF1EC;color:#2E6B58;border-radius:6px;padding:3px 8px;font-size:11px;font-weight:700;justify-self:start')}>{u.level}</span>
                  <b>{u.ptsS} P</b>
                  <span style={s('color:#6E6252')}>{u.activity}</span>
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      u.grant()
                    }}
                    style={s('cursor:pointer;background:#221C15;color:#F5F0E6;border-radius:999px;padding:7px 0;font-size:11.5px;font-weight:700;text-align:center;max-width:110px')}
                  >
                    +{admin.grantPoints} P 지급
                  </div>
                </div>
                {open && <Detail m={u.record} />}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
