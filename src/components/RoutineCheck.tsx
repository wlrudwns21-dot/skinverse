import { useState } from 'react'
import { addStep, extrasFull, extrasSub, extrasTitle, removeStep } from '../routine/extras'
import type { Slot } from '../routine/checklist'
import type { RoutineStepView } from '../store/StoreContext'
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
        'width:26px;height:26px;border-radius:9px;display:flex;align-items:center;justify-content:center;' +
          'font-size:14px;font-weight:700;flex-shrink:0;transition:background .15s ease;' +
          (done
            ? 'background:#2E6B58;color:#FFFFFF'
            : open
              ? 'background:#FFFFFF;border:1.5px solid #CFC5B0;color:transparent'
              : 'background:#F1EEE6;border:1.5px solid #E4DCCB;color:transparent'),
      )}
    >
      ✓
    </div>
  )
}

function StepRow({ step }: { step: RoutineStepView }) {
  const st = useStore()
  const dim = !step.open && !step.done

  return (
    <div
      onClick={step.canToggle ? step.toggle : undefined}
      style={s(
        'background:#FFFFFF;border:1px solid #ECE6DA;border-radius:12px;padding:12px 14px;' +
          'display:flex;gap:12px;align-items:center;' +
          (step.canToggle ? 'cursor:pointer' : 'cursor:default'),
      )}
    >
      <Tick done={step.done} open={step.open} />
      <div style={s('flex:1;min-width:0')}>
        <div
          style={s(
            'font-size:13px;font-weight:600;' +
              (step.done ? 'color:#8A7D6C;text-decoration:line-through' : dim ? 'color:#A2957F' : ''),
          )}
        >
          {step.name}
        </div>
        <div style={s(`font-size:11.5px;color:${dim ? '#BCB1A0' : '#8A7D6C'}`)}>{step.note}</div>
      </div>
      {step.extraId && (
        <span
          onClick={(e) => {
            e.stopPropagation()
            st.removeExtra(step.extraId!)
          }}
          style={s('cursor:pointer;font-size:11px;color:#B9AC93;flex-shrink:0;padding:4px')}
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
        style={s('cursor:pointer;border:1px dashed #D3C9B7;border-radius:12px;padding:11px;text-align:center;font-size:12.5px;font-weight:600;color:#8A7D6C')}
      >
        + {addStep[st.lang]}
      </div>
    )
  }

  return (
    <div style={s('background:#F8F5EF;border:1px solid #E7E1D4;border-radius:12px;padding:12px;animation:rise .2s ease both')}>
      <div style={s('display:flex;justify-content:space-between;align-items:baseline;gap:8px')}>
        <div style={s('font-size:12.5px;font-weight:700;color:#4A4234')}>{extrasTitle[st.lang]}</div>
        <div onClick={() => setOpen(false)} style={s('cursor:pointer;font-size:11.5px;color:#8A7D6C;flex-shrink:0')}>
          ✕
        </div>
      </div>
      <div style={s('font-size:11px;color:#A2957F;line-height:1.5;margin-top:3px')}>
        {extrasSub[st.lang]}
      </div>

      {full ? (
        <div style={s('font-size:12px;color:#9A8455;background:#FBF3E4;border-radius:8px;padding:9px 11px;margin-top:9px')}>
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
              style={s('cursor:pointer;background:#FFFFFF;border:1px solid #ECE6DA;border-radius:10px;padding:10px 12px')}
            >
              <div style={s('font-size:12.5px;font-weight:600;color:#221C15')}>
                {preset.name[st.lang]}
              </div>
              <div style={s('font-size:11px;color:#8A7D6C;line-height:1.45;margin-top:2px')}>
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

  return (
    <>
      <div style={s('display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin:18px 2px 8px')}>
        <div style={s('font-family:Marcellus,serif;font-size:17px')}>{heading}</div>
        <div style={s(`font-size:11px;flex-shrink:0;${shut ? 'color:#B9AC93' : 'color:#2E6B58;font-weight:600'}`)}>
          {shut ? c.windowShut(st.slotWindowLabel[slot]) : st.slotWindowLabel[slot]}
        </div>
      </div>
      <div style={s('display:flex;flex-direction:column;gap:8px')}>
        {steps.map((step) => (
          <StepRow key={step.slot + step.key} step={step} />
        ))}
        {st.isMember && <AddExtra slot={slot} />}
      </div>
    </>
  )
}
