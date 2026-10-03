import { useState } from 'react'
import {
  categoryNames,
  coreTip,
  coreTipLabel,
  minutesLabel,
  otherStories,
  readMore,
  storiesAll,
  storiesEmpty,
  storiesSub,
  storiesTitle,
  storiesToRoutine,
  storyImage,
  type Story,
  type StoryCategory,
} from '../data/stories'
import type { Lang } from '../data/types'
import { s } from '../lib/css'
import { useStore } from '../store/StoreContext'

/**
 * Skin Stories — the reading side of the product.
 *
 * The core tip sits at the top in full, because it is the one piece the routine
 * screen also points at and a customer arriving from there should land on it
 * already open. Everything else is a list that expands in place: a separate
 * detail screen for two paragraphs would cost a navigation and give nothing
 * back, and it would lose the reader's place in the list on the way home.
 *
 * Categories filter rather than paginate. The library is small enough that a
 * filter is a way of browsing; it becomes a way of finding as more is added.
 */

const CATEGORY_ORDER: StoryCategory[] = [
  'ingredient',
  'routineType',
  'weather',
  'trend',
  'case',
  'expert',
]

/** Enough of the first paragraph to decide by, cut on a word. */
function teaser(text: string, limit = 96): string {
  if (text.length <= limit) return text
  const cut = text.slice(0, limit)
  const space = cut.lastIndexOf(' ')
  // Korean, Chinese and Thai do not space between words, so a word boundary
  // only exists when there is one to find. Trailing punctuation is dropped so a
  // cut that lands after a full stop does not read as "…. " with four dots.
  const kept = space > limit * 0.6 ? cut.slice(0, space) : cut
  return kept.replace(/[\s,.、，。·—–-]+$/u, '') + '…'
}

export function Chip({ label, tone }: { label: string; tone: 'core' | 'category' }) {
  return (
    <span
      style={s(
        'font-size:10.5px;font-weight:500;border-radius:3px;padding:3px 9px;letter-spacing:0.04em;' +
          (tone === 'core' ? 'background:rgba(255,255,255,0.14);color:var(--on-dark)' : 'background:var(--surface-2);color:var(--ink-3)'),
      )}
    >
      {label}
    </span>
  )
}

/**
 * The photo on a card.
 *
 * A fixed aspect ratio rather than a height, so the crop is the same shape on
 * every screen width and the list does not reflow as the pictures arrive.
 * `loading="lazy"` because most of them are below the fold on arrival.
 */
function Cover({ story, lang, radius }: { story: Story; lang: Lang; radius: string }) {
  return (
    <img
      src={storyImage(story)}
      alt={story.title[lang]}
      loading="lazy"
      style={s(
        `display:block;width:100%;aspect-ratio:2/1;object-fit:cover;background:var(--surface-2);border-radius:${radius}`,
      )}
    />
  )
}

/** The core tip, laid out as the feature it is. */
export function CoreTipCard({ lang, onOpen }: { lang: Lang; onOpen?: () => void }) {
  return (
    <div
      onClick={onOpen}
      style={s(
        'background:var(--panel);color:var(--on-dark);border-radius:4px;position:relative;overflow:hidden' +
          (onOpen ? ';cursor:pointer' : ''),
      )}
    >
      <Cover story={coreTip} lang={lang} radius="0" />
      <div style={s('padding:18px 20px 20px;position:relative')}>
        <div style={s('position:absolute;right:-50px;top:-70px;width:170px;height:170px;border-radius:50%;background:radial-gradient(circle,var(--accent) 0%,transparent 70%);opacity:.55')} />
        <div style={s('display:flex;gap:6px;align-items:center;position:relative')}>
          <Chip label={coreTipLabel[lang]} tone="core" />
          <span style={s('font-size:10.5px;color:var(--on-dark-2)')}>
            {categoryNames[coreTip.category][lang]} · {minutesLabel(coreTip.minutes, lang)}
          </span>
        </div>
        <div style={s('font-family:Marcellus,"Noto Serif KR",serif;font-size:20px;line-height:1.3;margin:10px 0 8px;position:relative')}>
          {coreTip.title[lang]}
        </div>
        <div style={s('font-size:13px;line-height:1.65;color:var(--on-dark-2);position:relative')}>
          {coreTip.body[0][lang]}
        </div>
        <div style={s('font-size:13px;line-height:1.65;color:var(--on-dark-2);margin-top:9px;position:relative')}>
          {coreTip.body[1][lang]}
        </div>
      </div>
    </div>
  )
}

function StoryCard({ story, lang }: { story: Story; lang: Lang }) {
  const [open, setOpen] = useState(false)

  return (
    <div
      onClick={() => setOpen(!open)}
      style={s('cursor:pointer;background:var(--surface);border:1px solid var(--line);border-radius:4px;overflow:hidden')}
    >
      <Cover story={story} lang={lang} radius="0" />
      <div style={s('padding:14px 16px 15px')}>
        <div style={s('display:flex;gap:6px;align-items:center;flex-wrap:wrap')}>
          <Chip label={categoryNames[story.category][lang]} tone="category" />
          <span style={s('font-size:10.5px;color:var(--ink-4)')}>{minutesLabel(story.minutes, lang)}</span>
        </div>
        <div style={s('font-size:14.5px;font-weight:500;line-height:1.4;margin-top:8px;color:var(--ink)')}>
          {story.title[lang]}
        </div>

        {open ? (
          <div style={s('animation:rise .25s ease both')}>
            <div style={s('font-size:13px;line-height:1.7;color:var(--ink-2);margin-top:8px')}>
              {story.body[0][lang]}
            </div>
            <div style={s('font-size:13px;line-height:1.7;color:var(--ink-2);margin-top:9px')}>
              {story.body[1][lang]}
            </div>
          </div>
        ) : (
          <>
            <div style={s('font-size:12.5px;line-height:1.6;color:var(--ink-3);margin-top:6px')}>
              {teaser(story.body[0][lang])}
            </div>
            <div style={s('font-size:12px;font-weight:500;color:var(--accent);margin-top:8px')}>
              {readMore[lang]} →
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function Stories() {
  const st = useStore()
  const lang = st.lang
  const [filter, setFilter] = useState<StoryCategory | null>(null)

  const shown = filter ? otherStories.filter((x) => x.category === filter) : otherStories
  /** The core tip is a story too: a filter that matches it should show it. */
  const showCore = !filter || coreTip.category === filter

  return (
    <div style={s('padding:20px;animation:rise .4s ease both')}>
      <div style={s('font-family:Marcellus,"Noto Serif KR",serif;font-size:22px')}>{storiesTitle[lang]}</div>
      <div style={s('font-size:12px;color:var(--ink-3);margin-top:2px')}>{storiesSub[lang]}</div>

      <div style={s('display:flex;gap:6px;overflow-x:auto;margin-top:14px;padding-bottom:4px')}>
        {[null, ...CATEGORY_ORDER].map((category) => {
          const active = filter === category
          return (
            <div
              key={category ?? 'all'}
              onClick={() => setFilter(category)}
              style={s(
                'cursor:pointer;flex-shrink:0;font-size:12px;font-weight:500;border-radius:3px;padding:7px 12px;' +
                  (active
                    ? 'background:var(--accent);color:var(--on-dark)'
                    : 'background:var(--surface);border:1px solid var(--line);color:var(--ink-3)'),
              )}
            >
              {category === null ? storiesAll[lang] : categoryNames[category][lang]}
            </div>
          )
        })}
      </div>

      {showCore && (
        <div style={s('margin-top:14px')}>
          <CoreTipCard lang={lang} />
        </div>
      )}

      <div style={s('display:flex;flex-direction:column;gap:10px;margin-top:12px')}>
        {shown.map((story) => (
          <StoryCard key={story.id} story={story} lang={lang} />
        ))}
      </div>

      {!showCore && shown.length === 0 && (
        <div style={s('border:1px dashed var(--line-2);border-radius:4px;padding:18px;margin-top:14px;font-size:12.5px;color:var(--ink-3);text-align:center')}>
          {storiesEmpty[lang]}
        </div>
      )}

      <div
        onClick={st.goRoutine}
        style={s('cursor:pointer;margin-top:16px;background:var(--surface-2);border:1px solid var(--warn-mid);border-radius:4px;padding:13px 14px;font-size:13px;display:flex;justify-content:space-between;align-items:center')}
      >
        <b>{storiesToRoutine[lang]}</b>
        <span style={s('font-weight:500;color:var(--warn)')}>→</span>
      </div>
    </div>
  )
}
