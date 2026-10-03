import { PhotoBanner } from '../components/PhotoBanner'
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

/** How many story cards the home strip shows before "see all". Two, because
    they run at full width now rather than two to a row. */
const HOME_STORIES = 2

/* The screen is built from a few repeated pieces rather than a shape per
   block, which is what keeps it reading as one screen. A section stays inside
   a 20px gutter; banners, and nothing else, break out to both edges. */
const GUTTER = 'padding:0 20px'
const KICKER = 'font-size:9px;letter-spacing:0.26em;text-transform:uppercase;color:var(--ink-3)'
const MORE = 'cursor:pointer;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:var(--accent);font-weight:500'
const RULE = 'height:1px;background:var(--line)'
const EYEBROW = 'font-size:9px;letter-spacing:0.3em;text-transform:uppercase;color:var(--on-dark-2)'
/** The display face. Light and tight, and with Hangul that actually renders. */
const DISPLAY = 'font-family:Albert Sans,"Noto Sans KR",sans-serif;font-weight:300;letter-spacing:-0.01em'

export function Home() {
  const st = useStore()
  const lang = st.lang
  const dusty = Boolean(st.airAdvice)

  /* Three readings as numbers rather than a sentence — a glance is all anyone
     gives the weather, and the one that matters today is the one that is
     coloured. Fine dust is only a reading on the days the service reported it;
     on the days it is silent the slot carries UV instead, so the row never has
     a hole where a number should be. */
  const readings: { label: string; value: string; warn?: boolean }[] = [
    { label: st.t.temp, value: st.weather.t + '°' },
    { label: st.t.humidity, value: st.weather.h + '%' },
    st.weather.air === null || st.weather.air === undefined
      ? { label: 'UV', value: String(st.weather.uv) }
      : { label: st.t.dust, value: String(st.weather.air), warn: dusty },
  ]

  return (
    <div style={s('animation:rise .4s ease both;padding-bottom:4px')}>
      {/* ① The hero. Runs to both edges: the photograph is the first thing on
          the screen, and a margin around it would make it a card instead. */}
      <PhotoBanner src="/banner/hero.webp" ratio="390/318" slot="hero 390 × 318">
        <div style={s(EYEBROW)}>{st.t.kicker}</div>
        <div style={s(`${DISPLAY};font-size:25px;line-height:1.3;margin-top:10px;color:var(--on-dark)`)}>
          {st.t.heroT}
        </div>
        <div style={s('font-size:11.5px;color:var(--on-dark-2);line-height:1.6;margin-top:7px')}>{st.t.heroSub}</div>
        <div style={s('display:flex;align-items:center;gap:14px;margin-top:16px;flex-wrap:wrap')}>
          <div
            onClick={st.goScan}
            style={s('cursor:pointer;background:var(--surface);color:var(--ink);border-radius:3px;padding:14px 24px;font-size:13px;font-weight:500;letter-spacing:0.03em')}
          >
            {st.scansLeft === 0 && st.state.scanned ? st.t.viewReport : st.t.startBtn}
          </div>
          {/* What today actually allows, before the tap rather than after it.
              An allowance the server enforces and the screen never mentions is
              a refusal the customer meets by surprise. */}
          {st.quotaLine && (
            <span style={s(`font-size:11.5px;letter-spacing:0.05em;color:${st.scansLeft === 0 ? 'var(--warn-mid)' : 'var(--on-dark-2)'}`)}>
              {st.quotaLine}
            </span>
          )}
        </div>
      </PhotoBanner>

      {/* The readings, then today's advice. Directly under the hero, because
          it is the other thing on this screen that is true only of today. */}
      <div style={s(GUTTER)}>
        <div style={s('padding:17px 0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px')}>
          {readings.map((r) => (
            <div key={r.label}>
              <div style={s('font-size:9px;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-3)')}>{r.label}</div>
              <div style={s(`font-family:Albert Sans,sans-serif;font-weight:200;font-size:28px;margin-top:6px;line-height:1;color:${r.warn ? 'var(--warn)' : 'var(--ink)'}`)}>
                {r.value}
              </div>
            </div>
          ))}
        </div>

        <div style={s(RULE)} />

        <div onClick={st.goRoutine} style={s('cursor:pointer;padding:15px 0 18px;font-size:12.5px;line-height:1.8;color:var(--ink-2)')}>
          {st.wHint}
          {/* Only on the days it is warranted. A line that appears every
              morning stops being read, and then it says nothing on the day it
              mattered. */}
          {st.airAdvice && <span style={s('color:var(--warn);font-weight:500')}> {st.airAdvice}</span>}
          <span style={s('color:var(--ink-4)')}> ›</span>
        </div>

        <div style={s(RULE)} />

        {/* The score, written as a row of readings rather than a card, so it
            belongs to the same column of information as the weather above it
            instead of interrupting it. */}
        {st.state.scanned ? (
          <div onClick={st.goScan} style={s('cursor:pointer;padding:18px 0;display:flex;align-items:center;gap:16px')}>
            <div style={s(st.dialSmStyle)}>
              <div style={s('width:40px;height:40px;border-radius:50%;background:var(--bg);display:flex;align-items:center;justify-content:center;font-family:Albert Sans,sans-serif;font-weight:300;font-size:15px')}>
                {st.overall}
              </div>
            </div>
            <div style={s('flex:1;min-width:0')}>
              <div style={s('font-size:9px;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-3)')}>
                {st.t.skinScore}
              </div>
              <div style={s(`${DISPLAY};font-size:17px;margin-top:5px`)}>{st.skinType}</div>
              {/* What the record adds to today's number. A score on its own
                  says how the skin is; the pair says whether anything is
                  working. */}
              {st.vsLast && (
                <div style={s(`font-size:11.5px;font-weight:500;margin-top:5px;color:${st.vsLast.colour}`)}>
                  {st.vsLast.text}
                </div>
              )}
              {st.cumulativeLine && (
                <div style={s('font-size:11px;color:var(--ink-3);margin-top:2px')}>{st.cumulativeLine}</div>
              )}
            </div>
            <div style={s('color:var(--ink-4);font-size:15px;flex-shrink:0')}>›</div>
          </div>
        ) : (
          <div style={s('padding:18px 0;font-size:12.5px;color:var(--ink-3);line-height:1.7')}>{st.t.noScan}</div>
        )}
      </div>

      {/* ③ Today's missions, as the dark strip. It is the one thing here a
          customer can act on whether or not they scan or buy, and the strip is
          what separates the column of readings above from the pictures below.
          No photograph: the text fills the width, and a picture behind it
          would only make it harder to read. */}
      <div
        onClick={st.goMissions}
        style={s('cursor:pointer;background:var(--ink);padding:22px 20px;display:flex;align-items:center;gap:14px')}
      >
        <div style={s('flex:1;min-width:0')}>
          <div style={s(EYEBROW)}>{st.t.earnP}</div>
          <div style={s(`${DISPLAY};font-size:16px;margin-top:7px;color:var(--on-dark)`)}>
            {st.t.todayMissions} {st.dailyDoneS}
          </div>
          <div style={s('font-size:11.5px;color:var(--on-dark-2);margin-top:5px')}>
            {st.streakLine} · Lv. {st.levelName}
          </div>
        </div>
        <div style={s('color:var(--on-dark-2);font-size:15px;flex-shrink:0')}>→</div>
      </div>

      {/* ② 성분 분석, as an editorial banner rather than a menu row. It answers
          a question people arrive with — what is actually in this — and it is
          unmetered, unlike the face scan, so there is no allowance to explain
          here. */}
      <PhotoBanner
        src="/banner/ingredients.webp"
        ratio="390/228"
        slot="editorial 390 × 228"
        tint="var(--accent-soft)"
        deep
        onClick={st.goLabel}
      >
        <div style={s(EYEBROW)}>ingredients</div>
        <div style={s(`${DISPLAY};font-size:22px;line-height:1.34;margin-top:9px;color:var(--on-dark)`)}>
          성분을 읽습니다
        </div>
        <div style={s('font-size:11.5px;color:var(--on-dark-2);letter-spacing:0.02em;margin-top:11px;line-height:1.6')}>
          전성분을 식약처 등록 정보와 대조하고, 어린이 제한 성분을 확인합니다 →
        </div>
      </PhotoBanner>

      {/* The shelf. 4:5 rather than a square, which reads as a photograph
          instead of a thumbnail, and two across rather than a scrolling strip,
          so nothing sits off the edge of the screen unseen. */}
      <div style={s(`${GUTTER};padding-top:24px;padding-bottom:13px;display:flex;align-items:baseline;justify-content:space-between`)}>
        <span style={s(KICKER)}>{st.t.matched}</span>
        <span onClick={st.goShop} style={s(MORE)}>{st.t.allProducts}</span>
      </div>

      <div style={s(`${GUTTER};display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px`)}>
        {st.homeRecs.map((p) => (
          <div key={p.id} onClick={p.open} style={s('cursor:pointer')}>
            <div style={s(`width:100%;aspect-ratio:4/5;background:${p.grad}`)} />
            <div style={s('font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:var(--ink-3);margin-top:10px')}>
              {p.brand} · {p.kind}
            </div>
            <div style={s('font-size:12.5px;margin-top:4px;line-height:1.5')}>{p.name}</div>
            <div style={s('display:flex;justify-content:space-between;align-items:baseline;margin-top:5px;gap:8px')}>
              <span style={s('font-size:12px;color:var(--ink-2);letter-spacing:0.04em')}>{p.priceS}</span>
              <span style={s('font-size:10px;color:var(--accent);font-weight:500;flex-shrink:0')}>
                {p.matchS} {st.t.match}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Skin Stories. These keep the 2:1 shape the photographs were actually
          made at — cropping a 780x390 master into the shelf's 4:5 frame throws
          away three fifths of its width, and the subject with it. Two at full
          width rather than four in a grid, because at this ratio a half-width
          card is an 84px strip nobody can read. */}
      <div style={s(`${GUTTER};padding-top:26px;padding-bottom:4px;display:flex;align-items:baseline;justify-content:space-between`)}>
        <span style={s(KICKER)}>{storiesTitle[lang]}</span>
        <span onClick={st.goStories} style={s(MORE)}>{storiesHomeCta[lang]}</span>
      </div>
      <div style={s(`${GUTTER};font-size:11.5px;color:var(--ink-3);padding-bottom:13px;line-height:1.7`)}>
        {storiesSub[lang]}
      </div>

      <div style={s(`${GUTTER};display:flex;flex-direction:column;gap:20px`)}>
        {stories.slice(0, HOME_STORIES).map((story) => (
          <div key={story.id} onClick={st.goStories} style={s('cursor:pointer')}>
            <img
              src={storyImage(story)}
              alt={story.title[lang]}
              loading="lazy"
              style={s('display:block;width:100%;aspect-ratio:2/1;object-fit:cover;background:var(--surface-2)')}
            />
            <div style={s('display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-top:11px')}>
              <span style={s('font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:var(--ink-3)')}>
                {categoryNames[story.category][lang]}
              </span>
              <span style={s('font-size:10.5px;color:var(--ink-4);flex-shrink:0')}>
                {minutesLabel(story.minutes, lang)}
              </span>
            </div>
            <div style={s('font-size:13.5px;margin-top:5px;line-height:1.55')}>{story.title[lang]}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
