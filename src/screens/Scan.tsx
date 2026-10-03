import { useRef, useState } from 'react'
import { CameraCapture } from '../components/CameraCapture'
import { ConcernReport } from '../components/ConcernReport'
import { ImageSlot } from '../components/ImageSlot'
import { AxisTrends } from '../components/AxisTrends'
import { SkinMap } from '../components/SkinMap'
import { s } from '../lib/css'
import { BTN, DISPLAY, GUTTER, KICKER, RULE } from '../lib/ui'
import { useStore } from '../store/StoreContext'

export function ScanIntro() {
  const st = useStore()
  const [cameraOpen, setCameraOpen] = useState(false)
  const pickerRef = useRef<HTMLInputElement>(null)

  return (
    <div style={s(`${GUTTER};padding-top:22px;padding-bottom:4px;animation:rise .4s ease both`)}>
      <div style={s(KICKER)}>skin reading</div>
      <div style={s(`${DISPLAY};font-size:24px;margin-top:8px`)}>{st.t.scanTitle}</div>
      <div style={s('font-size:12px;color:var(--ink-3);margin-top:5px;line-height:1.6')}>{st.t.scanSub}</div>

      {/* Coming here on a new day opens the camera rather than the old report,
          because a new day is the reason to scan again — but the report is one
          tap away, not lost. */}
      <div style={s('display:flex;align-items:center;gap:8px;margin-top:10px;flex-wrap:wrap')}>
        {st.quotaLine && (
          <span style={s(`font-size:11.5px;letter-spacing:0.04em;color:${st.scansLeft === 0 ? 'var(--warn)' : 'var(--ink-3)'}`)}>
            {st.quotaLine}
          </span>
        )}
        {st.state.scanned && (
          <span onClick={st.showLastResult} style={s('cursor:pointer;font-size:11.5px;color:var(--accent);border-bottom:1px solid var(--accent-mid);padding-bottom:1px')}>
            {st.t.viewReport} →
          </span>
        )}
      </div>

      <div style={s('display:flex;justify-content:center;margin:22px 0 14px')}>
        <div style={s('width:210px;height:270px;position:relative')}>
          <ImageSlot
            mask="ellipse(50% 50% at 50% 50%)"
            placeholder={st.t.selfiePh}
            onChange={st.setPhoto}
            value={st.photo}
          />
          <div style={s('position:absolute;inset:-8px;border:1.5px dashed var(--ink-4);border-radius:50%;pointer-events:none')} />
        </div>
      </div>

      {/* Taking the photo here rather than picking one is what keeps it within
          the vendor's framing rules — the guide oval is the only chance to get
          that right before the analysis is spent. */}
      <div style={s('display:flex;gap:8px;justify-content:center;margin-bottom:16px')}>
        <div
          onClick={() => setCameraOpen(true)}
          style={s('cursor:pointer;border:1px solid var(--ink);border-radius:3px;padding:11px 20px;font-size:12.5px;font-weight:500;letter-spacing:0.03em')}
        >
          {st.a.camera.take}
        </div>
        <div
          onClick={() => pickerRef.current?.click()}
          style={s('cursor:pointer;border:1px solid var(--line-2);border-radius:3px;padding:11px 20px;font-size:12.5px;font-weight:500;letter-spacing:0.03em;color:var(--ink-2)')}
        >
          {st.a.camera.pick}
        </div>
      </div>

      <input
        ref={pickerRef}
        type="file"
        accept="image/jpeg,image/png"
        style={s('display:none')}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) st.setPhoto(file)
          e.target.value = ''
        }}
      />

      <CameraCapture
        open={cameraOpen}
        onCapture={st.setPhoto}
        onClose={() => setCameraOpen(false)}
        onUsePicker={() => pickerRef.current?.click()}
        t={st.a.camera}
      />

      {/* What the pre-flight check found. A problem is a hard stop, shown in
          red; a warning is advice the customer can ignore. */}
      {st.photoCheck?.problem && (
        <div style={s('padding:12px 14px;margin-bottom:14px;font-size:12.5px;color:var(--danger);background:var(--danger-soft);border-radius:3px;line-height:1.6')}>
          {st.a.photoError[st.photoCheck.problem]}
        </div>
      )}
      {st.photoCheck?.warning && (
        <div style={s('padding:12px 14px;margin-bottom:14px;font-size:12.5px;color:var(--warn);background:var(--warn-soft);border-radius:3px;line-height:1.6')}>
          {st.a.photoError[st.photoCheck.warning]}
        </div>
      )}

      {/* These are the vendor's own photo requirements, not general advice —
          a photo that misses them is rejected after we have been billed. So
          they are a numbered list of conditions, not a box of friendly tips. */}
      <div style={s(RULE)} />
      <div style={s('padding:16px 0 4px')}>
        <div style={s(KICKER)}>before you shoot</div>
        <div style={s('margin-top:12px;display:flex;flex-direction:column;gap:9px')}>
          {st.a.photoTips.map((tip, i) => (
            <div key={tip} style={s('display:flex;gap:11px;font-size:12.5px;line-height:1.6;color:var(--ink-2)')}>
              <span style={s('color:var(--ink-4);flex-shrink:0;font-variant-numeric:tabular-nums')}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span>{tip}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={s(RULE)} />

      {/* A guest is told before they frame a photo, not after. The pitch is
          what the account gives them — a saved record and a trend — rather than
          a refusal. */}
      {!st.isMember ? (
        <>
          <div style={s('padding:16px 0;font-size:12.5px;color:var(--ink-2);line-height:1.8')}>
            {st.a.scanMemberOnly}
          </div>
          <div onClick={() => st.goAuth('signup')} style={s(BTN)}>{st.a.scanMemberOnlyCta}</div>
          <div
            onClick={() => st.goAuth('login')}
            style={s('cursor:pointer;text-align:center;font-size:12px;color:var(--ink-3);margin-top:14px')}
          >
            {st.a.hasAccount} <span style={s('color:var(--accent);border-bottom:1px solid var(--accent-mid)')}>{st.a.logIn}</span>
          </div>
        </>
      ) : (
        <div
          onClick={st.startScan}
          style={s(
            'cursor:pointer;margin-top:20px;border-radius:3px;padding:15px;text-align:center;font-size:13px;font-weight:500;letter-spacing:0.03em' +
              (st.photoCheck?.problem
                ? ';background:transparent;border:1px solid var(--line-2);color:var(--ink-4)'
                : ';background:var(--accent);color:var(--on-dark)'),
          )}
        >
          {st.t.beginScan}
        </div>
      )}
    </div>
  )
}

export function Scanning() {
  const st = useStore()

  return (
    <div style={s('padding:40px 20px;display:flex;flex-direction:column;align-items:center;animation:rise .3s ease both')}>
      <div style={s('width:220px;height:280px;border-radius:3px;background:linear-gradient(160deg,var(--surface-2),var(--line));position:relative;overflow:hidden;border:1px solid var(--line-2)')}>
        <div style={s('position:absolute;left:8%;right:8%;height:2px;background:linear-gradient(90deg,transparent,var(--accent),transparent);box-shadow:0 0 14px var(--accent);animation:scanline 2.4s ease-in-out infinite')} />
        <div style={s('position:absolute;inset:14px;border:1px dashed rgba(46,107,88,0.4);border-radius:100px')} />
      </div>
      <div style={s('margin-top:26px;width:56px;height:56px;border-radius:50%;border:3px solid var(--line-2);border-top-color:var(--accent);animation:spin 1s linear infinite')} />
      <div style={s('font-family:Marcellus,"Noto Serif KR",serif;font-size:26px;margin-top:18px')}>{st.progress}%</div>
      <div style={s('font-size:13px;color:var(--ink-2);margin-top:6px;animation:pulse 1.6s ease infinite')}>{st.scanStatus}</div>
    </div>
  )
}

/**
 * Where a failed analysis lands.
 *
 * Deliberately a dead end with one way out. The alternative — dropping the
 * customer on a canned profile with a small "sample" badge — reads as a result,
 * and a result they cannot tell apart from a real one is worse than no result.
 */
export function ScanFailed() {
  const st = useStore()

  return (
    <div style={s('padding:40px 24px;animation:rise .4s ease both;display:flex;flex-direction:column;align-items:center;text-align:center')}>
      <div style={s('width:64px;height:64px;border-radius:50%;background:var(--danger-soft);border:1px solid var(--danger-soft);display:flex;align-items:center;justify-content:center;font-size:26px')}>
        !
      </div>
      <div style={s('font-family:Marcellus,"Noto Serif KR",serif;font-size:22px;margin-top:18px')}>
        {st.a.scanFailedTitle}
      </div>
      <div style={s('font-size:13px;color:var(--ink-3);margin-top:8px;line-height:1.6;max-width:300px')}>
        {st.scanError || st.a.analysisFailed}
      </div>

      <div style={s('background:var(--surface);border:1px solid var(--line);border-radius:4px;padding:14px 16px;margin-top:22px;font-size:12.5px;color:var(--ink-2);line-height:1.6;text-align:left')}>
        {st.a.scanFailedHelp}
      </div>

      <div
        onClick={st.retryScan}
        style={s('cursor:pointer;margin-top:22px;background:var(--accent);color:var(--on-dark);border-radius:3px;padding:15px 30px;font-size:14px;font-weight:500')}
      >
        {st.a.scanRetry}
      </div>
    </div>
  )
}

export function ScanResults() {
  const st = useStore()

  return (
    <div style={s('padding:24px 20px;animation:rise .4s ease both')}>
      <div style={s('text-align:center')}>
        <div style={s('display:inline-flex;' + st.dialStyle)}>
          <div style={s('width:112px;height:112px;border-radius:50%;background:var(--surface);margin:auto;display:flex;flex-direction:column;align-items:center;justify-content:center')}>
            <div style={s('font-family:Marcellus,"Noto Serif KR",serif;font-size:36px;line-height:1')}>{st.overall}</div>
            <div style={s('font-size:10px;color:var(--ink-3);letter-spacing:0.12em;margin-top:2px')}>{st.t.skinScoreU}</div>
          </div>
        </div>
        <div style={s('font-size:16px;font-weight:500;margin-top:12px')}>{st.skinType}</div>

        {st.skinAge !== null && (
          <div style={s('font-size:13px;color:var(--ink-3);margin-top:6px')}>
            {st.a.skinAge(st.skinAge)}
          </div>
        )}

        {/* A canned profile must never pass for a measurement. */}
        {!st.scanIsReal && (
          <div style={s('display:inline-block;margin-top:10px;background:var(--surface-2);border:1px solid var(--warn-mid);color:var(--warn);border-radius:3px;padding:5px 12px;font-size:11.5px;font-weight:500')}>
            {st.a.demoResult}
          </div>
        )}
      </div>

      <div style={s('background:var(--surface);border:1px solid var(--line);border-radius:4px;padding:16px;margin-top:18px;display:flex;flex-direction:column;gap:12px')}>
        {st.metrics.map((m) => (
          <div key={m.nameL}>
            <div style={s('display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px')}>
              <span style={s('font-weight:500')}>{m.nameL}</span>
              <span style={s(`font-weight:500;color:${m.color}`)}>{m.score} · {m.label}</span>
            </div>
            <div style={s('height:6px;background:var(--surface-2);border-radius:99px;overflow:hidden')}>
              <div style={s(`height:100%;border-radius:99px;width:${m.w};background:${m.color};transition:width .8s ease`)} />
            </div>
          </div>
        ))}
      </div>

      <div style={s('background:var(--surface-2);border-radius:4px;padding:16px;margin-top:12px;font-size:13px;line-height:1.6;color:var(--accent)')}>
        <b>{st.t.insight}</b>
        <br />
        {st.summary}
      </div>

      {/* The analysis drawn on their own face. Placed above the written report
          because seeing the pores that were counted is what makes the number
          beside them credible. */}
      {st.visuals && <SkinMap visuals={st.visuals} lang={st.lang} t={st.mapT} />}

      {/* All sixteen readings, grouped and explained. The six bars above are a
          headline; this is the measurement. */}
      {st.visuals && (
        <ConcernReport
          visuals={st.visuals}
          skinType={st.skinTypeReading}
          lang={st.lang}
          t={st.detailT}
        />
      )}

      {/* How each measurement has moved across every scan on file. The bars
          above say where the skin stands; this says whether it is going
          anywhere, which is the question a returning customer actually has. */}
      <AxisTrends changes={st.axisChanges} lang={st.lang} t={st.axisTrendT} />

      {/* What the numbers say beyond the bars: what is behind, what moved, and
          whether the weather explains it better than the routine does. */}
      {st.report.length > 0 && (
        <div style={s('background:var(--surface);border:1px solid var(--line);border-radius:4px;padding:16px;margin-top:12px')}>
          <div style={s('font-family:Marcellus,"Noto Serif KR",serif;font-size:16px')}>{st.reportTitle}</div>
          <div style={s('font-size:11.5px;color:var(--ink-4);margin-top:2px;margin-bottom:12px')}>
            {st.reportSub}
          </div>
          <div style={s('display:flex;flex-direction:column;gap:10px')}>
            {st.report.map((line) => (
              <div key={line.kind + line.text} style={s('display:flex;gap:9px;align-items:flex-start')}>
                <span
                  style={s(
                    'flex-shrink:0;width:6px;height:6px;border-radius:50%;margin-top:6px;background:' +
                      (line.tone === 'good' ? 'var(--accent)' : line.tone === 'bad' ? 'var(--warn)' : 'var(--ink-4)'),
                  )}
                />
                <span style={s('font-size:12.5px;line-height:1.55;color:var(--ink-2)')}>{line.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={s('display:flex;gap:10px;margin-top:16px')}>
        <div onClick={st.goShop} style={s('cursor:pointer;flex:1;background:var(--accent);color:var(--on-dark);border-radius:3px;padding:13px;text-align:center;font-size:13px;font-weight:500')}>
          {st.t.matchedBtn}
        </div>
        <div onClick={st.goRoutine} style={s('cursor:pointer;flex:1;background:var(--surface);border:1px solid var(--line-2);border-radius:3px;padding:13px;text-align:center;font-size:13px;font-weight:500')}>
          {st.t.routineBtn}
        </div>
      </div>

      {!st.isMember && (
        <div
          onClick={() => st.goAuth('signup')}
          style={s('cursor:pointer;background:var(--surface-2);border:1px solid var(--warn-mid);border-radius:4px;padding:13px 14px;margin-top:14px;display:flex;justify-content:space-between;align-items:center;gap:10px')}
        >
          <div style={s('font-size:12.5px;color:var(--warn);line-height:1.45')}>{st.a.gateSaveScan}</div>
          <span style={s('font-weight:500;color:var(--warn);flex-shrink:0')}>→</span>
        </div>
      )}

      {/* No rescan link. With one analysis a day, the offer is wrong almost
          every time it is shown — a customer reading their result has just
          spent today's. What is left is the one thing that link was really
          being asked: when can I do this again. That is a line, not a button. */}
      {st.scansLeft === 0 && (
        <div style={s('text-align:center;font-size:12px;color:var(--ink-4);margin-top:14px')}>
          {st.quotaLine}
        </div>
      )}
    </div>
  )
}
