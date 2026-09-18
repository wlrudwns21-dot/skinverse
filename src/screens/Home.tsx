import {
  categoryNames,
  minutesLabel,
  stories,
  storiesHomeCta,
  storiesSub,
  storiesTitle,
  storyImage,
} from '../data/stories'
import { s } from '../lib/css'
import { useStore } from '../store/StoreContext'

/** How many story cards the home strip shows before "see all". */
const HOME_STORIES = 4

export function Home() {
  const st = useStore()
  const lang = st.lang

  return (
    <div style={s('padding:20px;animation:rise .4s ease both')}>
      <div style={s('background:#221C15;color:#F5F0E6;border-radius:20px;padding:24px 22px;position:relative;overflow:hidden')}>
        <div style={s('position:absolute;right:-40px;top:-40px;width:160px;height:160px;border-radius:50%;background:radial-gradient(circle,#3C6B58 0%,transparent 70%);opacity:.6')} />
        <div style={s('font-size:11px;letter-spacing:0.14em;color:#C7B99E')}>{st.t.kicker}</div>
        <div style={s('font-family:Marcellus,serif;font-size:27px;line-height:1.25;margin:10px 0 6px')}>{st.t.heroT}</div>
        <div style={s('font-size:13px;color:#BDB2A0;line-height:1.5')}>{st.t.heroSub}</div>
        <div onClick={st.goScan} style={s('cursor:pointer;display:inline-block;margin-top:16px;background:#F5F0E6;color:#221C15;border-radius:999px;padding:11px 20px;font-size:13px;font-weight:700')}>
          {st.scansLeft === 0 && st.state.scanned ? st.t.viewReport : st.t.startBtn} →
        </div>
        {/* What today actually allows, before the tap rather than after it.
            An allowance the server enforces and the screen never mentions is
            a refusal the customer meets by surprise. */}
        {st.quotaLine && (
          <div style={s(`font-size:11.5px;margin-top:10px;font-weight:600;color:${st.scansLeft === 0 ? '#C7B99E' : '#9ECFB4'}`)}>
            {st.quotaLine}
          </div>
        )}
      </div>

      <div onClick={st.goRoutine} style={s('cursor:pointer;margin-top:14px;background:#FFFFFF;border:1px solid #ECE6DA;border-radius:16px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:10px')}>
        <div>
          <div style={s('font-size:12px;color:#8A7D6C')}>{st.t.todayIn} {st.placeLabel}</div>
          <div style={s('font-size:14px;font-weight:600;margin-top:3px')}>{st.wLine}</div>
          <div style={s('font-size:12px;color:#2E6B58;margin-top:3px;font-weight:500')}>{st.wHint}</div>
          {/* Only on the days it is warranted. A line that appears every
              morning stops being read, and then it is missing on the day it
              mattered. */}
          {st.airAdvice && (
            <div style={s('font-size:12px;color:#B4622F;margin-top:4px;font-weight:600;line-height:1.5')}>
              {st.airAdvice}
            </div>
          )}
        </div>
        <div style={s('color:#B0A490;font-size:18px')}>→</div>
      </div>

      {st.state.scanned ? (
        <div onClick={st.goScan} style={s('cursor:pointer;margin-top:14px;background:#EAF1EC;border:1px solid #CFE0D4;border-radius:16px;padding:14px 16px;display:flex;align-items:center;gap:14px')}>
          <div style={s(st.dialSmStyle)}>
            <div style={s('width:40px;height:40px;border-radius:50%;background:#EAF1EC;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px')}>
              {st.overall}
            </div>
          </div>
          <div style={s('flex:1;min-width:0')}>
            <div style={s('font-size:13px;font-weight:700')}>{st.t.skinScore} {st.overall} — {st.skinType}</div>
            {/* What the record adds to today's number. A score on its own says
                how the skin is; the pair says whether anything is working. */}
            {st.vsLast && (
              <div style={s(`font-size:11.5px;font-weight:600;margin-top:3px;color:${st.vsLast.colour}`)}>
                {st.vsLast.text}
              </div>
            )}
            {st.cumulativeLine && (
              <div style={s('font-size:11px;color:#8A7D6C;margin-top:2px')}>{st.cumulativeLine}</div>
            )}
            <div style={s('font-size:12px;color:#5E7A6C;margin-top:4px')}>{st.t.viewReport} →</div>
          </div>
        </div>
      ) : (
        <div style={s('margin-top:14px;border:1px dashed #D3C9B7;border-radius:16px;padding:14px 16px;font-size:12px;color:#8A7D6C;line-height:1.5')}>
          {st.t.noScan}
        </div>
      )}

      {/* Today's missions, straight under the score. The score is the reason
          someone opened the app; the missions are the one thing on this screen
          they can act on right now, and they were sitting below a product shelf
          most visits never reached. */}
      <div onClick={st.goMissions} style={s('cursor:pointer;margin-top:14px;background:#FFFFFF;border:1px solid #ECE6DA;border-radius:16px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:10px')}>
        <div style={s('min-width:0')}>
          <div style={s('font-size:13px;font-weight:700')}>{st.t.todayMissions} {st.dailyDoneS}</div>
          <div style={s('font-size:12px;color:#8A7D6C;margin-top:2px')}>🔥 {st.streakLine} · Lv. {st.levelName}</div>
        </div>
        <div style={s('background:#C29A5B;color:#FFF;border-radius:999px;font-size:11px;font-weight:700;padding:6px 10px;flex-shrink:0')}>{st.t.earnP} →</div>
      </div>

      {/* Skin Stories, above the shelf. Most visits are not a scan and not a
          purchase, so what a customer can do *today* has to be within reach —
          burying the reading under the product strip made it the last thing on
          a screen most people never scrolled to the end of. */}
      <div style={s('display:flex;align-items:baseline;justify-content:space-between;margin:22px 2px 2px')}>
        <div style={s('font-family:Marcellus,serif;font-size:18px')}>{storiesTitle[lang]}</div>
        <div onClick={st.goStories} style={s('cursor:pointer;font-size:12px;color:#2E6B58;font-weight:600')}>
          {storiesHomeCta[lang]} →
        </div>
      </div>
      <div style={s('font-size:11.5px;color:#8A7D6C;margin:0 2px 10px')}>{storiesSub[lang]}</div>

      <div style={s('display:flex;gap:10px;overflow-x:auto;padding-bottom:6px')}>
        {stories.slice(0, HOME_STORIES).map((story) => (
          <div
            key={story.id}
            onClick={st.goStories}
            style={s('cursor:pointer;min-width:190px;max-width:190px;background:#FFFFFF;border:1px solid #ECE6DA;border-radius:14px;overflow:hidden;display:flex;flex-direction:column')}
          >
            <img
              src={storyImage(story)}
              alt={story.title[lang]}
              loading="lazy"
              style={s('display:block;width:100%;aspect-ratio:2/1;object-fit:cover;background:#EFE9DD')}
            />
            <div style={s('padding:11px 13px 13px;display:flex;flex-direction:column;gap:5px;flex:1')}>
              <div style={s('font-size:10.5px;font-weight:700;color:#8A7D6C;letter-spacing:0.04em')}>
                {categoryNames[story.category][lang]}
              </div>
              <div style={s('font-size:13px;font-weight:700;line-height:1.4;color:#221C15')}>
                {story.title[lang]}
              </div>
              <div style={s('font-size:10.5px;color:#A2957F;margin-top:auto')}>
                {minutesLabel(story.minutes, lang)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={s('display:flex;align-items:baseline;justify-content:space-between;margin:22px 2px 10px')}>
        <div style={s('font-family:Marcellus,serif;font-size:18px')}>{st.t.matched}</div>
        <div onClick={st.goShop} style={s('cursor:pointer;font-size:12px;color:#2E6B58;font-weight:600')}>{st.t.allProducts} →</div>
      </div>

      <div style={s('display:flex;gap:10px;overflow-x:auto;padding-bottom:6px')}>
        {st.homeRecs.map((p) => (
          <div key={p.id} onClick={p.open} style={s('cursor:pointer;min-width:150px;background:#FFFFFF;border:1px solid #ECE6DA;border-radius:14px;padding:10px')}>
            <div style={s(`height:110px;border-radius:10px;background:${p.grad};display:flex;align-items:flex-end;padding:8px;box-sizing:border-box`)}>
              <span style={s('background:rgba(255,255,255,0.85);border-radius:6px;font-size:10px;padding:3px 6px;font-weight:600;color:#4A4234')}>{p.kind}</span>
            </div>
            <div style={s('font-size:10px;color:#8A7D6C;letter-spacing:0.1em;margin-top:8px')}>{p.brand}</div>
            <div style={s('font-size:12px;font-weight:600;line-height:1.3;margin-top:2px')}>{p.name}</div>
            <div style={s('display:flex;justify-content:space-between;align-items:center;margin-top:6px')}>
              <span style={s('font-size:13px;font-weight:700')}>{p.priceS}</span>
              <span style={s('font-size:10px;font-weight:700;color:#2E6B58;background:#EAF1EC;border-radius:6px;padding:2px 6px')}>{p.matchS} {st.t.match}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
