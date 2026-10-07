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
