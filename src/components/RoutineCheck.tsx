import { useState } from 'react'
import { addStep, extrasFull, extrasSub, extrasTitle, removeStep } from '../routine/extras'
import type { Slot } from '../routine/checklist'
import type { RoutineStepView } from '../store/StoreContext'
import { SectionHead } from './SectionHead'
import { s } from '../lib/css'
import { useStore } from '../store/StoreContext'

/**
 * The routine, as something you do rather than something you read.
 *
 * Each step is a checkbox, and a checkbox that can be ticked at any hour
 * measures nothing: a morning cleanse logged at midnight is not a morning
 * cleanse. So a step outside its window is shown in full — the customer still
 * needs to know what today asks of them — but greyed, with the hours it opens
 * written next to it rather than left to be guessed at.
 */

function Tick({ done, open }: { done: boolean; open: boolean }) {
  return (
    <div
      style={s(
        'width:26px;height:26px;border-radius:4px;display:flex;align-items:center;justify-content:center;' +
          'font-size:14px;font-weight:500;flex-shrink:0;transition:background .15s ease;' +
          (done
            ? 'background:var(--accent);color:var(--on-accent)'
            : open
              ? 'background:var(--surface);border:1.5px solid var(--line-2);color:transparent'
              : 'background:var(--surface-2);border:1.5px solid var(--line-2);color:transparent'),
      )}
    >
      ✓
    </div>
  )
}

function StepRow({ step, n }: { step: RoutineStepView; n: number }) {
  const st = useStore()
  const dim = !step.open && !step.done

  return (
    <div
      onClick={step.canToggle ? step.toggle : undefined}
      style={s(
        'border-top:1px solid var(--line);padding:13px 0;' +
          'display:flex;gap:11px;align-items:center;' +
          (step.canToggle ? 'cursor:pointer' : 'cursor:default'),
      )}
    >
      {/* The order matters — toner before cream, cream before sunscreen — and
          nine unnumbered rows do not say so. Tabular figures keep the ticks
          in a straight line once the count passes nine. */}
      <div
        style={s(
          'width:13px;flex-shrink:0;text-align:right;font-size:10.5px;' +
            'font-variant-numeric:tabular-nums;letter-spacing:0;' +
            `color:${step.done ? 'var(--ink-4)' : 'var(--ink-3)'}`,
        )}
      >
        {n}
      </div>
      <Tick done={step.done} open={step.open} />
      <div style={s('flex:1;min-width:0')}>
        <div
          style={s(
            'font-size:13px;line-height:1.5;' +
              (step.done ? 'color:var(--ink-3);text-decoration:line-through' : dim ? 'color:var(--ink-3)' : ''),
          )}
        >
          {step.name}
        </div>
        <div style={s(`font-size:11.5px;line-height:1.5;margin-top:2px;color:${dim ? 'var(--ink-4)' : 'var(--ink-3)'}`)}>{step.note}</div>
      </div>
      {step.extraId && (
        <span
          onClick={(e) => {
            e.stopPropagation()
            st.removeExtra(step.extraId!)
          }}
          style={s('cursor:pointer;font-size:11px;color:var(--ink-4);flex-shrink:0;padding:4px')}
        >
          {removeStep[st.lang]}
        </span>
      )}
    </div>
  )
}

/** The picker for a member's own additions — a list, never a text box. */
function AddExtra({ slot }: { slot: Slot }) {
  const st = useStore()
  const [open, setOpen] = useState(false)

  const choices = st.addableExtras(slot)
  const full = st.extrasAtLimit(slot)

  if (!open) {
    return (
      <div
        onClick={() => setOpen(true)}
        style={s('cursor:pointer;border-top:1px solid var(--line);padding:14px 0;text-align:center;font-size:12px;letter-spacing:0.04em;color:var(--link)')}
      >
        + {addStep[st.lang]}
      </div>
    )
  }

  return (
    <div style={s('background:var(--surface);border:1px solid var(--line-2);border-radius:4px;padding:12px;animation:rise .2s ease both')}>
      <div style={s('display:flex;justify-content:space-between;align-items:baseline;gap:8px')}>
        <div style={s('font-size:12.5px;font-weight:500;color:var(--ink-2)')}>{extrasTitle[st.lang]}</div>
        <div onClick={() => setOpen(false)} style={s('cursor:pointer;font-size:11.5px;color:var(--ink-3);flex-shrink:0')}>
          ✕
        </div>
      </div>
      <div style={s('font-size:11px;color:var(--ink-4);line-height:1.5;margin-top:3px')}>
        {extrasSub[st.lang]}
      </div>

      {full ? (
        <div style={s('font-size:12px;color:var(--warn);background:var(--surface-2);border-radius:4px;padding:9px 11px;margin-top:9px')}>
          {extrasFull[st.lang]}
        </div>
      ) : (
        <div style={s('display:flex;flex-direction:column;gap:6px;margin-top:9px')}>
          {choices.map((preset) => (
            <div
              key={preset.id}
              onClick={() => {
                st.addExtra(slot, preset.id)
                setOpen(false)
              }}
              style={s('cursor:pointer;background:var(--surface);border:1px solid var(--line);border-radius:4px;padding:10px 12px')}
            >
              <div style={s('font-size:12.5px;font-weight:500;color:var(--ink)')}>
                {preset.name[st.lang]}
              </div>
              <div style={s('font-size:11px;color:var(--ink-3);line-height:1.45;margin-top:2px')}>
                {preset.note[st.lang]}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function RoutineCheck({
  slot,
  steps,
  heading,
}: {
  slot: Slot
  steps: RoutineStepView[]
  heading: string
}) {
  const st = useStore()
  const c = st.checkT
  const shut = !steps.some((step) => step.open)
  const done = steps.filter((step) => step.done).length

  return (
    <>
      <SectionHead
        label={heading}
        done={done}
        total={steps.length}
        meta={{
          text: shut ? c.windowShut(st.slotWindowLabel[slot]) : st.slotWindowLabel[slot],
          dim: shut,
        }}
      />
      <div style={s('margin-top:8px')}>
        {steps.map((step, i) => (
          <StepRow key={step.slot + step.key} step={step} n={i + 1} />
        ))}
        {st.isMember && <AddExtra slot={slot} />}
      </div>
    </>
  )
}
