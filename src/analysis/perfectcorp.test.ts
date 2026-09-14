import { describe, expect, it } from 'vitest'
import { mapScoreInfo, toScoreInfo, UnreadableAnalysis, type ScoreInfo } from './perfectcorp'

/**
 * The two payloads Perfect Corp publishes as samples, verbatim. Testing against
 * their own documented output is the closest we can get to the real thing
 * without a key, and it pins the mapping to a contract we did not invent.
 */
const HD_SAMPLE: ScoreInfo = {
  hd_redness: { raw_score: 72.011962890625, ui_score: 77, output_mask_name: 'hd_redness_output.png' },
  hd_oiliness: { raw_score: 60.74365234375, ui_score: 72, output_mask_name: 'hd_oiliness_output.png' },
  hd_age_spot: { raw_score: 83.23274230957031, ui_score: 77, output_mask_name: 'hd_age_spot_output.png' },
  hd_radiance: { raw_score: 76.57244205474854, ui_score: 79, output_mask_name: 'hd_radiance_output.png' },
  hd_moisture: { raw_score: 48.694559931755066, ui_score: 70, output_mask_name: 'hd_moisture_output.png' },
  hd_dark_circle: { raw_score: 80.1993191242218, ui_score: 76, output_mask_name: 'hd_dark_circle_output.png' },
  hd_eye_bag: { raw_score: 76.67280435562134, ui_score: 79, output_mask_name: 'hd_eye_bag_output.png' },
  hd_droopy_upper_eyelid: { raw_score: 79.05348539352417, ui_score: 80, output_mask_name: 'hd_droopy_upper_eyelid_output.png' },
  hd_droopy_lower_eyelid: { raw_score: 79.97175455093384, ui_score: 81, output_mask_name: 'hd_droopy_lower_eyelid_output.png' },
  hd_firmness: { raw_score: 89.66898322105408, ui_score: 85, output_mask_name: 'hd_firmness_output.png' },
  hd_texture: { whole: { raw_score: 66.3921568627451, ui_score: 75, output_mask_name: 'hd_texture_output.png' } },
  hd_acne: { whole: { raw_score: 59.92677688598633, ui_score: 76, output_mask_name: 'hd_acne_output.png' } },
  hd_pore: {
    forehead: { raw_score: 79.59770965576172, ui_score: 80, output_mask_name: 'hd_pore_output_forehead.png' },
    nose: { raw_score: 29.139814376831055, ui_score: 58, output_mask_name: 'hd_pore_output_nose.png' },
    cheek: { raw_score: 44.11081314086914, ui_score: 65, output_mask_name: 'hd_pore_output_cheek.png' },
    whole: { raw_score: 49.23978805541992, ui_score: 67, output_mask_name: 'hd_pore_output_all.png' },
  },
  hd_wrinkle: {
    forehead: { raw_score: 55.96956729888916, ui_score: 67, output_mask_name: 'hd_wrinkle_output_forehead.png' },
    glabellar: { raw_score: 76.7251181602478, ui_score: 75, output_mask_name: 'hd_wrinkle_output_glabellar.png' },
    crowfeet: { raw_score: 83.4361481666565, ui_score: 78, output_mask_name: 'hd_wrinkle_output_crowfeet.png' },
    periocular: { raw_score: 67.88706302642822, ui_score: 72, output_mask_name: 'hd_wrinkle_output_periocular.png' },
    nasolabial: { raw_score: 74.03312683105469, ui_score: 74, output_mask_name: 'hd_wrinkle_output_nasolabial.png' },
    marionette: { raw_score: 71.94477319717407, ui_score: 73, output_mask_name: 'hd_wrinkle_output_marionette.png' },
    whole: { raw_score: 49.64699745178223, ui_score: 65, output_mask_name: 'hd_wrinkle_output_all.png' },
  },
  all: { score: 75.75757575757575 },
  skin_age: 37,
}

const SD_SAMPLE: ScoreInfo = {
  wrinkle: { raw_score: 36.09360456466675, ui_score: 60, output_mask_name: 'wrinkle_output.png' },
  droopy_upper_eyelid: { raw_score: 79.05348539352417, ui_score: 80, output_mask_name: 'droopy_upper_eyelid_output.png' },
  droopy_lower_eyelid: { raw_score: 79.97175455093384, ui_score: 81, output_mask_name: 'droopy_lower_eyelid_output.png' },
  firmness: { raw_score: 89.66898322105408, ui_score: 85, output_mask_name: 'firmness_output.png' },
  acne: { raw_score: 92.29713000000001, ui_score: 88, output_mask_name: 'acne_output.png' },
  moisture: { raw_score: 48.694559931755066, ui_score: 70, output_mask_name: 'moisture_output.png' },
  eye_bag: { raw_score: 76.67280435562134, ui_score: 79, output_mask_name: 'eye_bag_output.png' },
  dark_circle_v2: { raw_score: 80.1993191242218, ui_score: 76, output_mask_name: 'dark_circle_v2_output.png' },
  age_spot: { raw_score: 83.23274230957031, ui_score: 77, output_mask_name: 'age_spot_output.png' },
  radiance: { raw_score: 76.57244205474854, ui_score: 79, output_mask_name: 'radiance_output.png' },
  redness: { raw_score: 72.011962890625, ui_score: 77, output_mask_name: 'redness_output.png' },
  oiliness: { raw_score: 60.74365234375, ui_score: 72, output_mask_name: 'oiliness_output.png' },
  pore: { raw_score: 88.38014125823975, ui_score: 84, output_mask_name: 'pore_output.png' },
  texture: { raw_score: 80.09742498397827, ui_score: 76, output_mask_name: 'texture_output.png' },
  all: { score: 75.75757575757575 },
  skin_age: 37,
}

describe('HD payload', () => {
  const result = mapScoreInfo(HD_SAMPLE)

  it('maps every axis from the documented keys', () => {
    expect(result.metrics).toEqual({
      hydration: 49, // hd_moisture 48.69
      elasticity: 90, // hd_firmness 89.67
      pores: 49, // hd_pore.whole 49.24
      pigmentation: 83, // hd_age_spot 83.23
      wrinkles: 50, // hd_wrinkle.whole 49.65
      sensitivity: 72, // hd_redness 72.01
    })
  })

  it('reads nested categories from `whole`, not a region', () => {
    // hd_pore.nose is 29 and hd_pore.forehead is 80; taking either instead of
    // the summary would badly skew the weakest-axis pick.
    expect(result.metrics.pores).toBe(49)
  })

  it('uses their reported overall rather than recomputing', () => {
    expect(result.overall).toBe(76)
  })

  it('carries skin age through', () => {
    expect(result.skinAge).toBe(37)
  })

  it('classifies moisture 49 / oiliness 61 as dehydrated', () => {
    expect(result.condition).toBe('dehydrated')
  })
})

describe('SD payload', () => {
  const result = mapScoreInfo(SD_SAMPLE)

  it('maps the flat SD keys onto the same axes', () => {
    expect(result.metrics).toEqual({
      hydration: 49, // moisture
      elasticity: 90, // firmness
      pores: 88, // pore
      pigmentation: 83, // age_spot
      wrinkles: 36, // wrinkle
      sensitivity: 72, // redness
    })
  })

  it('agrees with HD on the overall and the skin age', () => {
    expect(result.overall).toBe(76)
    expect(result.skinAge).toBe(37)
  })
})

describe('score direction', () => {
  it('treats higher as better, matching their documented scale', () => {
    const better = mapScoreInfo({ ...SD_SAMPLE, moisture: { raw_score: 95 } })
    const worse = mapScoreInfo({ ...SD_SAMPLE, moisture: { raw_score: 12 } })
    expect(better.metrics.hydration).toBeGreaterThan(worse.metrics.hydration)
  })

  it('reads raw_score, not the flattered ui_score', () => {
    // Their docs are explicit that ui_score is adjusted upward to please the
    // customer. Recommendations must not be built on a flattered number.
    expect(mapScoreInfo(SD_SAMPLE).metrics.hydration).toBe(49) // raw 48.69, ui 70
  })
})

describe('skin type classification', () => {
  it('prefers their explicit label when present', () => {
    expect(mapScoreInfo({ ...SD_SAMPLE, skin_type: { whole: 'Oily' } }).condition).toBe('oily')
    expect(mapScoreInfo({ ...SD_SAMPLE, skin_type: { whole: 'Dry & Redness' } }).condition).toBe('dehydrated')
    expect(mapScoreInfo({ ...SD_SAMPLE, skin_type: { whole: 'Normal' } }).condition).toBe('balanced')
    expect(mapScoreInfo({ ...SD_SAMPLE, skin_type: { whole: 'Combination' } }).condition).toBe('oily')
  })

  it('reads a nested label shape without crashing', () => {
    const nested = { ...SD_SAMPLE, hd_skin_type: { whole: { type: 'Oily' } } }
    expect(mapScoreInfo(nested).condition).toBe('oily')
  })

  it('falls back to the numbers when the label is missing or unknown', () => {
    // A low oiliness score is oily skin — high is the healthy end of their scale.
    const oily = mapScoreInfo({ ...SD_SAMPLE, moisture: { raw_score: 70 }, oiliness: { raw_score: 30 } })
    expect(oily.condition).toBe('oily')

    const balanced = mapScoreInfo({ ...SD_SAMPLE, moisture: { raw_score: 75 }, oiliness: { raw_score: 80 } })
    expect(balanced.condition).toBe('balanced')
  })
})

describe('defensive parsing', () => {
  it('substitutes a neutral 50 for a missing axis rather than a 0', () => {
    const { moisture: _omitted, ...withoutMoisture } = SD_SAMPLE
    const result = mapScoreInfo(withoutMoisture as ScoreInfo)
    // A 0 would read as catastrophic and drag every recommendation toward it.
    expect(result.metrics.hydration).toBe(50)
  })

  it('computes an overall when `all` is absent', () => {
    const { all: _omitted, ...withoutAll } = SD_SAMPLE
    const result = mapScoreInfo(withoutAll as ScoreInfo)
    expect(result.overall).toBe(70) // mean of 49, 90, 88, 83, 36, 72
  })

  it('refuses an unrecognisable payload instead of inventing neutral scores', () => {
    // Six tidy 50s would look like a measurement. Better to fail and let the
    // caller show the clearly-labelled demo.
    expect(() => mapScoreInfo({})).toThrow(UnreadableAnalysis)
    expect(() => mapScoreInfo({ all: { score: 80 }, skin_age: 30 })).toThrow(UnreadableAnalysis)
  })

  it('does not diagnose on an axis it never received', () => {
    // moisture missing, oiliness healthy: nothing here says "dehydrated".
    const { moisture: _m, ...rest } = SD_SAMPLE
    const result = mapScoreInfo({ ...rest, oiliness: { raw_score: 80 } } as ScoreInfo)
    expect(result.condition).toBe('balanced')
  })

  it('ignores a non-numeric skin age', () => {
    expect(mapScoreInfo({ ...SD_SAMPLE, skin_age: undefined }).skinAge).toBeNull()
  })
})

/**
 * The `format: "json"` example from their OpenAPI description, verbatim. This
 * is the shape we actually receive, so the converter is pinned to their own
 * published sample rather than to an assumption about it.
 */
const JSON_OUTPUT = [
  { type: 'hd_wrinkle', region: 'whole', raw_score: 25.3, ui_score: 25, mask_urls: ['x'] },
  { type: 'hd_wrinkle', region: 'forehead', raw_score: 20.1, ui_score: 20, mask_urls: ['x'] },
  { type: 'hd_wrinkle', region: 'glabellar', raw_score: 15.8, ui_score: 16, mask_urls: ['x'] },
  { type: 'hd_wrinkle', region: 'crowfeet', raw_score: 30.5, ui_score: 31, mask_urls: ['x'] },
  { type: 'hd_pore', region: 'whole', raw_score: 35.2, ui_score: 35, mask_urls: ['x'] },
  { type: 'hd_pore', region: 'forehead', raw_score: 30, ui_score: 30, mask_urls: ['x'] },
  { type: 'hd_pore', region: 'nose', raw_score: 45.7, ui_score: 46, mask_urls: ['x'] },
  { type: 'hd_pore', region: 'cheek', raw_score: 32.1, ui_score: 32, mask_urls: ['x'] },
  { type: 'hd_acne', region: 'whole', raw_score: 12.5, ui_score: 13, mask_urls: ['x'] },
  { type: 'hd_skin_type', region: 'whole', skin_type: 'Combination', mask_urls: ['x'] },
  { type: 'hd_skin_type', region: 't_zone', skin_type: 'Oily', mask_urls: ['x'] },
  { type: 'hd_skin_type', region: 'u_zone', skin_type: 'Dry & Redness', mask_urls: ['x'] },
  { type: 'skin_age', score: 29 },
  { type: 'all', score: 28.5 },
  { type: 'resize_image', mask_urls: ['x'] },
]

describe('toScoreInfo', () => {
  it('nests the regional categories under their region', () => {
    const info = toScoreInfo(JSON_OUTPUT)
    expect(info.hd_pore).toEqual({
      whole: { raw_score: 35.2, ui_score: 35 },
      forehead: { raw_score: 30, ui_score: 30 },
      nose: { raw_score: 45.7, ui_score: 46 },
      cheek: { raw_score: 32.1, ui_score: 32 },
    })
  })

  it('lifts the overall score and skin age out of the array', () => {
    const info = toScoreInfo(JSON_OUTPUT)
    expect(info.all).toEqual({ score: 28.5 })
    expect(info.skin_age).toBe(29)
  })

  it('keeps the skin type label where the classifier looks for it', () => {
    const info = toScoreInfo(JSON_OUTPUT)
    expect(info.hd_skin_type).toEqual({
      whole: 'Combination',
      t_zone: 'Oily',
      u_zone: 'Dry & Redness',
    })
    // Combination counts as oily for our three-way classification.
    expect(mapScoreInfo(toScoreInfo(JSON_OUTPUT)).condition).toBe('oily')
  })

  it('drops the resized source image, which is not a measurement', () => {
    expect(toScoreInfo(JSON_OUTPUT).resize_image).toBeUndefined()
  })

  it('flattens a category that reports no region', () => {
    // Their step-7 example shows SD categories arriving without a region.
    const info = toScoreInfo([{ type: 'texture', ui_score: 68, raw_score: 57.33 }])
    expect(info.texture).toEqual({ raw_score: 57.33, ui_score: 68 })
  })

  it('feeds the mapper a payload it reads the same as the archive form', () => {
    const viaJson = mapScoreInfo(toScoreInfo(JSON_OUTPUT))
    // whole-face scores, not the regional ones
    expect(viaJson.metrics.wrinkles).toBe(25)
    expect(viaJson.metrics.pores).toBe(35)
    expect(viaJson.overall).toBe(29)
    expect(viaJson.skinAge).toBe(29)
  })

  it('refuses an output array with nothing recognisable in it', () => {
    expect(() => mapScoreInfo(toScoreInfo([{ type: 'resize_image' }]))).toThrow(UnreadableAnalysis)
  })
})
