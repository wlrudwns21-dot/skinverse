import type { Lang, SkinConditionKey } from './types'

/**
 * SAMPLE DATA — the signed-in demo shopper.
 * Replace with the real session/profile payload once auth is wired up.
 */
export const demoAccount = {
  name: 'Yuki Tanaka',
  addr: '2-11-3 Jinnan, Shibuya City, Tokyo 150-0041',
  country: 'Japan',
  startingPoints: 1240,
  /** Consecutive days of fully-cleared daily missions. */
  streak: 6,
  /** Missions already cleared when the app opens. */
  doneMissions: { m2: true } as Record<string, boolean>,
  routineReminders: true,
}

/**
 * Demo scenario knobs. In the prototype these were the right-hand "Tweaks"
 * panel; here they are the app's starting defaults.
 */
export const demoScenario = {
  language: 'ko' as Lang,
  skinCondition: 'dehydrated' as SkinConditionKey,
  city: 'Tokyo',
}

/**
 * SAMPLE DATA — prior scans shown in My Page, newest first.
 * Scores are expressed as an offset from the current scan's overall score so
 * the history stays coherent across the three demo skin conditions.
 * `typeKey` picks the caption: the diagnosed skin type, or "first analysis".
 */
export const scanHistory: {
  date: string
  scanNo: number
  typeKey: 'condition' | 'first'
  offset: number
  color: string
}[] = [
  { date: 'Aug 30', scanNo: 2, typeKey: 'condition', offset: -4, color: '#B08133' },
  { date: 'Aug 16', scanNo: 1, typeKey: 'first', offset: -7, color: '#C25E43' },
]

/** Date shown against the current (latest) scan. */
export const latestScanDate = 'Sep 13'
