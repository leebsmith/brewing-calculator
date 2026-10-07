/**
 * @file pureFunctions.js
 * @description Pure, side-effect-free conversion helpers for grain extract
 * potential and gravity-unit interconversion. All functions validate their
 * inputs and return NaN (with a console.error) on invalid arguments.
 */

import { BREW_CONSTANTS } from '../../constants.js';

/**
 * Converts a fractional extract potential (0..1) to imperial gallon-points
 * per pound (ppg), scaled by the sucrose reference constant.
 *
 * @param {number} extractPotentialFraction - Fraction in [0, 1].
 * @returns {number} Imperial yield in ppg, or NaN if input is invalid.
 */
export function grainYieldToImperialGallonPointsPerPound(extractPotentialFraction) {
  const value = Number(extractPotentialFraction);
  if (typeof extractPotentialFraction !== 'number' || isNaN(value) || value < 0 || value > 1) {
    console.error("Invalid input: 'extractPotentialFraction' must be a number between 0 and 1.");
    return NaN;
  }
  return value * BREW_CONSTANTS.IMPERIAL_POTENTIAL_SCALING_FACTOR;
}

/**
 * Converts a fractional extract potential (0..1) to metric liter-degrees per
 * kilogram (L·°/kg), scaled by the sucrose reference constant.
 *
 * @param {number} extractPotentialFraction - Fraction in [0, 1].
 * @returns {number} Metric yield in L·°/kg, or NaN if input is invalid.
 */
export function calculateMetricLiterDegreesPerKg(extractPotentialFraction) {
  const value = Number(extractPotentialFraction);
  if (typeof extractPotentialFraction !== 'number' || isNaN(value) || value < 0 || value > 1) {
    console.error("Invalid input: 'extractPotentialFraction' must be a number between 0 and 1.");
    return NaN;
  }
  return value * BREW_CONSTANTS.METRIC_POTENTIAL_SCALING_FACTOR;
}

/**
 * Converts specific gravity points per pound per gallon (ppg) to metric
 * liter-degrees per kilogram (L·°/kg).
 *
 * @param {number} ppg - Non-negative ppg value.
 * @returns {number} L·°/kg value, or NaN if input is invalid.
 */
export function LDKFromPPG(ppg) {
  const value = Number(ppg);
  if (typeof ppg !== 'number' || isNaN(value) || value < 0) {
    console.error("Invalid input: 'ppg' must be a number.");
    return NaN;
  }
  return value * BREW_CONSTANTS.LDK_PPG_CONVERSION_FACTOR;
}

/**
 * Converts metric liter-degrees per kilogram (L·°/kg) to specific gravity
 * points per pound per gallon (ppg).
 *
 * @param {number} ldk - Non-negative L·°/kg value.
 * @returns {number} ppg value, or NaN if input is invalid.
 */
export function PPGFromLDK(ldk) {
  const value = Number(ldk);
  if (typeof ldk !== 'number' || isNaN(value) || value < 0) {
    console.error("Invalid input: 'ldk' must be a number.");
    return NaN;
  }
  return value / BREW_CONSTANTS.LDK_PPG_CONVERSION_FACTOR;
}

/**
 * Determines whether a malt's contribution percentage is a "trace" amount
 * (below the 2% threshold used by the grain bill editor).
 *
 * @param {number} pct - Percentage in [0, 100].
 * @returns {boolean} True if the percentage is below the trace threshold.
 */
export function isTracePercentage(pct) {
  const value = Number(pct);
  if (isNaN(value)) return false;
  return value < 2.0;
}

/**
 * Hamilton (largest-remainder) proportional allocation.
 *
 * Given an array of non-negative "parts" values, distributes exactly 1000
 * tenths-of-a-percent (i.e. 100.0% at 0.1% resolution) across the rows so the
 * total is exactly 100.0%. Ties in the fractional remainder are broken by
 * larger `parts`, then by original index, guaranteeing deterministic output.
 *
 * This is a PURE function: it does not mutate its input and returns a new
 * array of percentages (one per input row, in the original order).
 *
 * @param {Array<{parts: number}>} rows - Rows with a numeric `parts` field.
 * @returns {number[]} Percentages (0..100) aligned to the input order.
 */
export function allocateProportionalPercentages(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const totalParts = rows.reduce(
    (sum, r) => sum + Math.max(0, parseFloat(r.parts) || 0),
    0
  );

  if (totalParts === 0) {
    return rows.map(() => 0.0);
  }

  const scaled = rows.map((r, idx) => {
    const parts = Math.max(0, parseFloat(r.parts) || 0);
    const rawScaled = (parts / totalParts) * 1000;
    const floored = Math.floor(rawScaled);
    const remainder = rawScaled - floored;
    return { index: idx, parts, floored, remainder };
  });

  const currentSum = scaled.reduce((sum, item) => sum + item.floored, 0);
  const deficit = 1000 - currentSum;

  scaled.sort((a, b) => {
    if (Math.abs(b.remainder - a.remainder) > 1e-9) {
      return b.remainder - a.remainder;
    }
    if (b.parts !== a.parts) {
      return b.parts - a.parts;
    }
    return a.index - b.index;
  });

  const finalScaled = new Array(rows.length);
  scaled.forEach((item, rank) => {
    let val = item.floored;
    if (rank < deficit) {
      val += 1;
    }
    finalScaled[item.index] = val;
  });

  return finalScaled.map((tenths) => tenths / 10.0);
}
