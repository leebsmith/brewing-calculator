/**
 * Mash schedule utilities.
 *
 * Pure, framework-agnostic helpers for the Mash Card. This module owns:
 *
 *   - the canonical rest vocabulary and preset matrix (design record Q2),
 *   - the enforced ascending-temperature sort with canonical-order tiebreak (Q5),
 *   - the strike water temperature derivation (Q3 / Q3a),
 *   - the Limit of Attenuation readout via the Braukaiser model (Q6b).
 *
 * All temperatures are handled in Celsius (the canonical storage unit). The
 * units store converts to °F at the display boundary; no imperial formula is
 * implemented here (design record Q3).
 */

import { BREW_CONSTANTS } from '../../constants.js';

/**
 * Specific heat capacity of dry malted barley, in kcal/(kg·°C).
 *
 * Equivalently 0.38 BTU/(lb·°F). Because water's specific heat is
 * 1.0 kcal/(kg·°C) and its density is 1 kg/L, this constant is used directly
 * in the metric strike water formula (design record Q3a).
 */
export const C_GRAIN_KCAL_PER_KG_C = 0.41;

/**
 * Canonical rest vocabulary, in canonical order (design record Q2).
 *
 * The array index defines the canonical order used as the tiebreaker when two
 * enabled rests share the same "use" temperature (design record Q5). Do not
 * reorder this array without updating the design record.
 */
export const CANONICAL_RESTS = Object.freeze([
  {
    rest_id: 'phytase',
    name: 'Phytase / Acid Rest',
    temp_min_c: 35,
    temp_max_c: 52,
    purpose: 'Lowers mash pH naturally (rarely used today; replaced by modern brewing acids).',
  },
  {
    rest_id: 'ferulic',
    name: 'Ferulic Acid Rest',
    temp_min_c: 43,
    temp_max_c: 45,
    purpose: 'Releases ferulic acid to create the clove-like aroma in German Hefeweizens.',
  },
  {
    rest_id: 'beta_glucan',
    name: 'Beta-Glucan Rest',
    temp_min_c: 45,
    temp_max_c: 50,
    purpose: 'Breaks down gums in sticky, high-viscosity grains like oats, rye, and unmalted wheat.',
  },
  {
    rest_id: 'protein',
    name: 'Protein Rest',
    temp_min_c: 50,
    temp_max_c: 54,
    purpose: 'Breaks down complex proteins to improve yeast health and reduce chill haze in under-modified malts.',
  },
  {
    rest_id: 'beta_amylase',
    name: 'Beta-Amylase Rest',
    temp_min_c: 62,
    temp_max_c: 65,
    purpose: 'Creates highly fermentable sugars (maltose) for a dry, clean-finishing beer with high alcohol conversion.',
  },
  {
    rest_id: 'alpha_amylase',
    name: 'Alpha-Amylase Rest',
    temp_min_c: 68,
    temp_max_c: 72,
    purpose: 'Breaks down remaining starches into unfermentable dextrins, adding body and reducing fermentability.',
  },
  {
    rest_id: 'beta_alpha_amylase',
    name: 'Beta/Alpha-Amylase Rest',
    temp_min_c: 62,
    temp_max_c: 72,
    purpose: 'Simultaneous beta- and alpha-amylase activity for balanced everyday brewing. Used as the "single infusion" rest.',
  },
]);

/**
 * The two always-present bookend steps (design record Q2, Q10).
 *
 * Dough-in is the first rest and is marked with "→" in the UI. Mash-out is a
 * separate step constrained to 75.5–76.7 °C (168–170 °F). Neither is part of
 * the preset toggle set.
 */
export const DOUGH_IN_REST = Object.freeze({
  rest_id: 'dough_in',
  name: 'Dough-in',
  temp_min_c: null,
  temp_max_c: null,
  purpose: 'First rest. Strike water temperature is derived from the dough-in target temperature.',
});

export const MASH_OUT_REST = Object.freeze({
  rest_id: 'mash_out',
  name: 'Mash-out',
  temp_min_c: 75.5,
  temp_max_c: 76.7,
  purpose: 'Raises the mash to mash-out temperature to halt enzymatic activity and improve lautering.',
});

/**
 * Named preset matrix (design record Q2).
 *
 * Each preset lists the canonical `rest_id`s it enables, in canonical order.
 * Dough-in and mash-out are always present and are not listed here.
 */
export const MASH_PRESETS = Object.freeze({
  custom: Object.freeze([]),
  belgian_saison: Object.freeze(['beta_glucan', 'protein', 'beta_amylase']),
  belgian_tripel: Object.freeze(['beta_amylase']),
  german_pils: Object.freeze(['beta_amylase', 'alpha_amylase']),
  berliner_weisse: Object.freeze(['phytase', 'beta_alpha_amylase']),
  english_brown: Object.freeze(['alpha_amylase']),
  american_pale: Object.freeze(['beta_alpha_amylase']),
});

/**
 * Human-readable labels for the preset dropdown.
 */
export const MASH_PRESET_LABELS = Object.freeze({
  custom: 'Custom',
  belgian_saison: 'Belgian Saison / Bière de Garde',
  belgian_tripel: 'Belgian Tripel / Dubbel / Golden Strong',
  german_pils: 'German Pils / Dortmunder (Hochkurz)',
  berliner_weisse: 'Traditional Berliner Weisse',
  english_brown: 'English Brown / Mild / Oatmeal Stout',
  american_pale: 'American Pale / IPA / Porter / Standard Ale',
});

/**
 * Look up a canonical rest definition by `rest_id`.
 *
 * @param {string} restId
 * @returns {object|null} The canonical rest, or null if unknown.
 */
export function getCanonicalRest(restId) {
  if (restId === DOUGH_IN_REST.rest_id) return DOUGH_IN_REST;
  if (restId === MASH_OUT_REST.rest_id) return MASH_OUT_REST;
  return CANONICAL_RESTS.find((r) => r.rest_id === restId) || null;
}

/**
 * Canonical order index for a `rest_id`, used as the sort tiebreaker (Q5).
 *
 * Dough-in sorts first, mash-out sorts last, canonical rests sort by their
 * position in `CANONICAL_RESTS`.
 *
 * @param {string} restId
 * @returns {number}
 */
export function canonicalOrderIndex(restId) {
  if (restId === DOUGH_IN_REST.rest_id) return -1;
  if (restId === MASH_OUT_REST.rest_id) return CANONICAL_RESTS.length;
  const idx = CANONICAL_RESTS.findIndex((r) => r.rest_id === restId);
  return idx === -1 ? CANONICAL_RESTS.length + 1 : idx;
}

/**
 * Sort enabled rests into ascending "use" temperature order (design record Q5).
 *
 * The order is enforced, not arbitrary. Equal "use" temperatures are ordered
 * by canonical rest order, making the sort stable and deterministic. Rests
 * with a null `use_temp_c` sort after those with a temperature, by canonical
 * order.
 *
 * @param {Array<object>} rests - Rest entries with `rest_id` and `use_temp_c`.
 * @returns {Array<object>} A new array, sorted. The input is not mutated.
 */
export function sortRestsByTemperature(rests) {
  return [...rests].sort((a, b) => {
    const aTemp = a.use_temp_c;
    const bTemp = b.use_temp_c;
    const aHas = typeof aTemp === 'number' && !isNaN(aTemp);
    const bHas = typeof bTemp === 'number' && !isNaN(bTemp);

    if (aHas && bHas && aTemp !== bTemp) return aTemp - bTemp;
    if (aHas !== bHas) return aHas ? -1 : 1;
    return canonicalOrderIndex(a.rest_id) - canonicalOrderIndex(b.rest_id);
  });
}

/**
 * Derive the strike water temperature from the dough-in target temperature.
 *
 * Implements the metric form of the fundamental thermodynamic equation
 * (design record Q3a):
 *
 *   T_strike_c = T_target_c + (C_grain / R) * (T_target_c - T_grain_c)
 *
 * where `C_grain = 0.41 kcal/(kg·°C)` for dry malted barley. The imperial form
 * is intentionally not implemented; the units store converts the result at the
 * display boundary.
 *
 * @param {number} targetTempC - Dough-in target temperature, in °C.
 * @param {number} grainTempC - Initial grain temperature, in °C.
 * @param {number} mashThicknessLPerKg - Water-to-grist ratio, in L/kg. Must be > 0.
 * @returns {number} Strike water temperature in °C, or NaN if inputs are invalid.
 */
export function calculateStrikeWaterTempC(targetTempC, grainTempC, mashThicknessLPerKg) {
  const target = Number(targetTempC);
  const grain = Number(grainTempC);
  const thickness = Number(mashThicknessLPerKg);

  if (isNaN(target) || isNaN(grain) || isNaN(thickness)) {
    console.error('calculateStrikeWaterTempC: all inputs must be numeric.');
    return NaN;
  }
  if (thickness <= 0) {
    console.error('calculateStrikeWaterTempC: mash thickness must be greater than zero.');
    return NaN;
  }

  return target + (C_GRAIN_KCAL_PER_KG_C / thickness) * (target - grain);
}

/**
 * Check whether a rest's "use" temperature is outside its recommended range.
 *
 * Soft-warn only (design record Q9). Returns false when the rest has no
 * recommended range (dough-in) or no "use" temperature set.
 *
 * @param {string} restId
 * @param {number|null} useTempC
 * @returns {boolean} True when the value is outside the recommended range.
 */
export function isRestTempOutOfRange(restId, useTempC) {
  const rest = getCanonicalRest(restId);
  if (!rest || rest.temp_min_c == null || rest.temp_max_c == null) return false;
  if (typeof useTempC !== 'number' || isNaN(useTempC)) return false;
  return useTempC < rest.temp_min_c || useTempC > rest.temp_max_c;
}

/**
 * Braukaiser empirical Limit of Attenuation (LoA) parameters.
 *
 * Ported from the reference implementation:
 *
 *   estimated_loa = base_attenuation
 *                 - (target_temp_c - base_temp_c) * attenuation_drop_per_c
 *
 * clamped to [loa_min_pct, loa_max_pct]. Valid for standard malt blends
 * within 63–70 °C. The baseline is 82% at 63 °C, dropping 3.5 percentage
 * points per °C of rest temperature.
 */
export const BRAUKAISER_BASE_ATTENUATION_PCT = 82.0;
export const BRAUKAISER_BASE_TEMP_C = 63.0;
export const BRAUKAISER_DROP_PER_C = 3.5;
export const BRAUKAISER_LOA_MIN_PCT = 60.0;
export const BRAUKAISER_LOA_MAX_PCT = 88.0;

/**
 * Estimate the Limit of Attenuation (LoA) for a single saccharification rest.
 *
 * Direct port of the Braukaiser empirical model. Returns a percentage in
 * [60, 88], clamped. Valid for standard malt blends within 63–70 °C.
 *
 * @param {number} targetTempC - Saccharification rest temperature, in °C.
 * @param {number} [baseAttenuationPct] - Malt-specific baseline attenuation.
 * @param {number} [baseTempC] - Temperature at which the baseline applies.
 * @param {number} [dropPerC] - Attenuation drop per °C above the baseline.
 * @returns {number} Estimated LoA as a percentage, or NaN if input is invalid.
 */
export function estimateSingleRestLoaPct(
  targetTempC,
  baseAttenuationPct = BRAUKAISER_BASE_ATTENUATION_PCT,
  baseTempC = BRAUKAISER_BASE_TEMP_C,
  dropPerC = BRAUKAISER_DROP_PER_C
) {
  const temp = Number(targetTempC);
  if (isNaN(temp)) {
    console.error('estimateSingleRestLoaPct: target temperature must be numeric.');
    return NaN;
  }
  const estimated = baseAttenuationPct - (temp - baseTempC) * dropPerC;
  return Math.max(BRAUKAISER_LOA_MIN_PCT, Math.min(BRAUKAISER_LOA_MAX_PCT, estimated));
}

/**
 * Estimate the Limit of Attenuation (LOA) from the mash schedule.
 *
 * Informational only — does not feed the solver (design record Q6b). Uses the
 * Braukaiser model per saccharification rest, then duration-weights the
 * per-rest results into a single schedule-level estimate.
 *
 * The Braukaiser model is defined for a single-infusion rest. A step mash has
 * several saccharification rests, so each enabled saccharification rest is
 * scored with `estimateSingleRestLoaPct` and the scores are combined by
 * duration. This preserves the model's per-rest behavior while producing one
 * readout for the summary table.
 *
 * @param {Array<object>} rests - Rest entries with `rest_id`, `enabled`,
 *   `use_temp_c`, and `duration_min`.
 * @returns {number} Estimated apparent attenuation as a fraction in [0, 1],
 *   or NaN when no saccharification rest is enabled.
 */
export function estimateLimitOfAttenuation(rests) {
  let weightedSum = 0;
  let totalDuration = 0;

  for (const rest of rests) {
    if (!rest.enabled) continue;
    if (typeof rest.use_temp_c !== 'number' || isNaN(rest.use_temp_c)) continue;
    if (typeof rest.duration_min !== 'number' || isNaN(rest.duration_min)) continue;
    if (rest.duration_min <= 0) continue;

    // Only saccharification rests contribute to fermentability.
    const isSaccharification =
      rest.rest_id === 'beta_amylase' ||
      rest.rest_id === 'alpha_amylase' ||
      rest.rest_id === 'beta_alpha_amylase';
    if (!isSaccharification) continue;

    const loaPct = estimateSingleRestLoaPct(rest.use_temp_c);
    if (isNaN(loaPct)) continue;

    weightedSum += loaPct * rest.duration_min;
    totalDuration += rest.duration_min;
  }

  if (totalDuration === 0) return NaN;

  // Duration-weighted mean LoA, converted from percent to the manifest's
  // canonical attenuation fraction.
  return (weightedSum / totalDuration) / 100.0;
}

/**
 * Build a fresh, default mash schedule for a new batch (design record Q10).
 *
 * Dough-in and mash-out are always present with `enabled: true`. All optional
 * rests are present with `enabled: false`, preserving the user's custom temps
 * across toggles. `preset_id` starts at `'custom'`.
 *
 * @returns {object} A `manifest.mash` object.
 */
export function createDefaultMashSchedule() {
  const rests = [
    {
      rest_id: DOUGH_IN_REST.rest_id,
      enabled: true,
      use_temp_c: null,
      duration_min: null,
    },
    ...CANONICAL_RESTS.map((rest) => ({
      rest_id: rest.rest_id,
      enabled: false,
      use_temp_c: null,
      duration_min: null,
    })),
    {
      rest_id: MASH_OUT_REST.rest_id,
      enabled: true,
      use_temp_c: null,
      duration_min: null,
      is_true_mash_out: false,
    },
  ];

  return {
    preset_id: 'custom',
    grain_temp_c: BREW_CONSTANTS.DEFAULT_GRAIN_TEMP_C,
    rests,
  };
}

/**
 * Apply a named preset to a mash schedule (design record Q2, Q10).
 *
 * Preset switching is idempotent: it flips `enabled` flags and sets
 * `use_temp_c` / `duration_min` to the preset's defaults without adding or
 * removing array entries. The user's custom temps are preserved when a rest is
 * toggled off and back on.
 *
 * @param {object} schedule - The current `manifest.mash` object.
 * @param {string} presetId - The preset to apply.
 * @returns {object} A new schedule object. The input is not mutated.
 */
export function applyMashPreset(schedule, presetId) {
  const enabledIds = MASH_PRESETS[presetId];
  if (!enabledIds) {
    console.error(`applyMashPreset: unknown preset "${presetId}".`);
    return schedule;
  }

  const rests = schedule.rests.map((rest) => {
    // Bookends are never preset-controlled.
    if (rest.rest_id === DOUGH_IN_REST.rest_id || rest.rest_id === MASH_OUT_REST.rest_id) {
      return { ...rest };
    }
    const shouldEnable = enabledIds.includes(rest.rest_id);
    const canonical = getCanonicalRest(rest.rest_id);
    return {
      ...rest,
      enabled: shouldEnable,
      // Seed a sensible default "use" temperature the first time a rest is
      // enabled, but never clobber a value the user has already set.
      use_temp_c:
        shouldEnable && rest.use_temp_c == null && canonical
          ? (canonical.temp_min_c + canonical.temp_max_c) / 2
          : rest.use_temp_c,
    };
  });

  return { ...schedule, preset_id: presetId, rests };
}

/**
 * Flip a schedule's `preset_id` to `'custom'` after a manual edit (Q2, Q10).
 *
 * Named presets are read-only snapshots; any manual divergence means the
 * schedule is no longer that preset. Mirrors the grain bill's `is_custom`
 * pattern.
 *
 * @param {object} schedule
 * @returns {object} A new schedule object with `preset_id: 'custom'`.
 */
export function markScheduleCustom(schedule) {
  if (schedule.preset_id === 'custom') return schedule;
  return { ...schedule, preset_id: 'custom' };
}
