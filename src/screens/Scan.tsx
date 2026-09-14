import { ImageSlot } from '../components/ImageSlot'
import { s } from '../lib/css'
import { useStore } from '../store/StoreContext'

export function ScanIntro() {
  const st = useStore()

  return (
    <div style={s('padding:24px 20px;animation:rise .4s ease both')}>
      <div style={s('font-family:Marcellus,serif;font-size:24px')}>{st.t.scanTitle}</div>
      <div style={s('font-size:13px;color:#8A7D6C;margin-top:4px')}>{st.t.scanSub}</div>

      <div style={s('display:flex;justify-content:center;margin:22px 0')}>
        <div style={s('width:210px;height:270px;position:relative')}>
          <ImageSlot
            mask="ellipse(50% 50% at 50% 50%)"
            placeholder={st.t.selfiePh}
            onChange={st.setPhoto}
          />
          <div style={s('position:absolute;inset:-8px;border:1.5px dashed #B9AC93;border-radius:50%;pointer-events:none')} />
        </div>
      </div>

      {/* What the pre-flight check found. A problem is a hard stop, shown in
          red; a warning is advice the customer can ignore. */}
      {st.photoCheck?.problem && (
        <div style={s('background:#FBECEC;border:1px solid #E9C9C9;border-radius:14px;padding:12px 14px;margin-bottom:14px;font-size:12.5px;color:#A5504B;line-height:1.5')}>
          {st.a.photoError[st.photoCheck.problem]}
        </div>
      )}
      {st.photoCheck?.warning && (
        <div style={s('background:#FBF3E4;border:1px solid #EBD9B8;border-radius:14px;padding:12px 14px;margin-bottom:14px;font-size:12.5px;color:#9A8455;line-height:1.5')}>
          {st.a.photoError[st.photoCheck.warning]}
        </div>
      )}

      {/* These are the vendor's own photo requirements, not general advice —
          a photo that misses them is rejected after we have been billed. */}
      <div style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:10px')}>
        {st.a.photoTips.map((tip) => (
          <div key={tip} style={s('display:flex;gap:10px;font-size:13px')}>
            <span style={s('color:#2E6B58;font-weight:700')}>✓</span>
            <span>{tip}</span>
          </div>
        ))}
      </div>

      <div style={s('font-size:12px;color:#8A7D6C;line-height:1.5;margin-top:12px;text-align:center')}>
        {st.a.photoNeeded}
      </div>

      {/* Guests may try the analysis once a day; the notice sets that
          expectation before they spend it rather than after. */}
      {!st.isMember && (
        <div style={s('background:#FBF3E4;border:1px solid #EBD9B8;border-radius:14px;padding:12px 14px;margin-top:14px;font-size:12.5px;color:#9A8455;line-height:1.5')}>
          {st.guestScanUsed ? st.a.guestScanUsed : st.a.guestScanNotice}
        </div>
      )}

      <div
        onClick={st.startScan}
        style={s(
          'cursor:pointer;margin-top:18px;border-radius:999px;padding:15px;text-align:center;font-size:14px;font-weight:700' +
            (st.photoCheck?.problem
              ? ';background:#CFC7B8;color:#FFFFFF'
              : ';background:#221C15;color:#F5F0E6'),
        )}
      >
        {st.t.beginScan}
      </div>
      <div style={s('text-align:center;font-size:11px;color:#A2957F;margin-top:10px')}>{st.t.demoNote}</div>
    </div>
  )
}

export function Scanning() {
  const st = useStore()

  return (
    <div style={s('padding:40px 20px;display:flex;flex-direction:column;align-items:center;animation:rise .3s ease both')}>
      <div style={s('width:220px;height:280px;border-radius:110px;background:linear-gradient(160deg,#EDE6D8,#DDD2BE);position:relative;overflow:hidden;border:1px solid #D8CDB8')}>
        <div style={s('position:absolute;left:8%;right:8%;height:2px;background:linear-gradient(90deg,transparent,#2E6B58,transparent);box-shadow:0 0 14px #2E6B58;animation:scanline 2.4s ease-in-out infinite')} />
        <div style={s('position:absolute;inset:14px;border:1px dashed rgba(46,107,88,0.4);border-radius:100px')} />
      </div>
      <div style={s('margin-top:26px;width:56px;height:56px;border-radius:50%;border:3px solid #E4DCCB;border-top-color:#2E6B58;animation:spin 1s linear infinite')} />
      <div style={s('font-family:Marcellus,serif;font-size:26px;margin-top:18px')}>{st.progress}%</div>
      <div style={s('font-size:13px;color:#6E6252;margin-top:6px;animation:pulse 1.6s ease infinite')}>{st.scanStatus}</div>
    </div>
  )
}

export function ScanResults() {
  const st = useStore()

  return (
    <div style={s('padding:24px 20px;animation:rise .4s ease both')}>
      <div style={s('text-align:center')}>
        <div style={s('display:inline-flex;' + st.dialStyle)}>
          <div style={s('width:112px;height:112px;border-radius:50%;background:#F8F5EF;margin:auto;display:flex;flex-direction:column;align-items:center;justify-content:center')}>
            <div style={s('font-family:Marcellus,serif;font-size:36px;line-height:1')}>{st.overall}</div>
            <div style={s('font-size:10px;color:#8A7D6C;letter-spacing:0.12em;margin-top:2px')}>{st.t.skinScoreU}</div>
          </div>
        </div>
        <div style={s('font-size:16px;font-weight:700;margin-top:12px')}>{st.skinType}</div>

        {st.skinAge !== null && (
          <div style={s('font-size:13px;color:#8A7D6C;margin-top:6px')}>
            {st.a.skinAge(st.skinAge)}
          </div>
        )}

        {/* A canned profile must never pass for a measurement. */}
        {!st.scanIsReal && (
          <div style={s('display:inline-block;margin-top:10px;background:#FBF3E4;border:1px solid #EBD9B8;color:#9A8455;border-radius:999px;padding:5px 12px;font-size:11.5px;font-weight:700')}>
            {st.a.demoResult}
          </div>
        )}
      </div>

      <div style={s('background:#FFFFFF;border:1px solid #ECE6DA;border-radius:16px;padding:16px;margin-top:18px;display:flex;flex-direction:column;gap:12px')}>
        {st.metrics.map((m) => (
          <div key={m.nameL}>
            <div style={s('display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px')}>
              <span style={s('font-weight:600')}>{m.nameL}</span>
              <span style={s(`font-weight:700;color:${m.color}`)}>{m.score} · {m.label}</span>
            </div>
            <div style={s('height:6px;background:#EFE9DD;border-radius:99px;overflow:hidden')}>
              <div style={s(`height:100%;border-radius:99px;width:${m.w};background:${m.color};transition:width .8s ease`)} />
            </div>
          </div>
        ))}
      </div>

      <div style={s('background:#EAF1EC;border-radius:16px;padding:16px;margin-top:12px;font-size:13px;line-height:1.6;color:#2C4A3E')}>
        <b>{st.t.insight}</b>
        <br />
        {st.summary}
      </div>

      <div style={s('display:flex;gap:10px;margin-top:16px')}>
        <div onClick={st.goShop} style={s('cursor:pointer;flex:1;background:#221C15;color:#F5F0E6;border-radius:999px;padding:13px;text-align:center;font-size:13px;font-weight:700')}>
          {st.t.matchedBtn}
        </div>
        <div onClick={st.goRoutine} style={s('cursor:pointer;flex:1;background:#FFFFFF;border:1px solid #D8CFBF;border-radius:999px;padding:13px;text-align:center;font-size:13px;font-weight:700')}>
          {st.t.routineBtn}
        </div>
      </div>

      {!st.isMember && (
        <div
          onClick={() => st.goAuth('signup')}
          style={s('cursor:pointer;background:#FBF3E4;border:1px solid #EBD9B8;border-radius:14px;padding:13px 14px;margin-top:14px;display:flex;justify-content:space-between;align-items:center;gap:10px')}
        >
          <div style={s('font-size:12.5px;color:#9A8455;line-height:1.45')}>{st.a.gateSaveScan}</div>
          <span style={s('font-weight:700;color:#C29A5B;flex-shrink:0')}>→</span>
        </div>
      )}

      <div onClick={st.startScan} style={s('cursor:pointer;text-align:center;font-size:12px;color:#8A7D6C;margin-top:14px;text-decoration:underline')}>
        {st.t.rescan}
      </div>
    </div>
  )
}
