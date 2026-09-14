/** A routine step as stored in Postgres (`routines.am_steps` / `pm_steps`). */
export interface RoutineStepRecord {
  n: number
  name: string
  note: string
}
