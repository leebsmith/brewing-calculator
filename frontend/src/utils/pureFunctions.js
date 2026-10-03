/**
 * @file pureFunctions.js
 * @description Contains utility pure functions for calculations and data transformations.
 * Adheres to functional programming principles:
 * - No side effects.
 * - Deterministic output for given inputs.
 * - Does not rely on or mutate external state.
 */

// Import constants from the central configuration file
// Assumes constants.js is in the parent directory relative to utils/
import { BREW_CONSTANTS } from '../constants.js';

/**
 * Calculates the extract yield in imperial gallons*points/lb.
 * This function takes a fractional representation of extract potential (0-1)
 * and multiplies it by the maximum potential extract of pure sucrose (IMPERIAL_POTENTIAL_SCALING_FACTOR)
 * to determine the final yield in the specified imperial units.
 *
 * @param {number} extractPotentialFraction - The fraction of maximum extract potential (e.g., 0.80 for 80%). Must be between 0 and 1.
 * @returns {number} The calculated grain yield in imperial gallons*points/lb, or NaN if the input is invalid.
 */
export function grainYieldToImperialGallonPointsPerPound(extractPotentialFraction) {
  const maxPotentialExtract = BREW_CONSTANTS.IMPERIAL_POTENTIAL_SCALING_FACTOR; // Uses 46.21 gal*points/lb

  // Ensure input is a number between 0 and 1 for valid fractional potential
  if (typeof extractPotentialFraction !== 'number' || extractPotentialFraction < 0 || extractPotentialFraction > 1) {
    console.error("Invalid input: 'extractPotentialFraction' must be a number between 0 and 1.");
    return NaN; // Not a Number for invalid input
  }

  return extractPotentialFraction * maxPotentialExtract;
}

/**
 * Calculates the extract yield in metric units (liter*degrees/kg).
 * This function takes a fractional representation of extract potential (0-1)
 * and multiplies it by the maximum potential extract of pure sucrose in metric units (METRIC_POTENTIAL_SCALING_FACTOR)
 * to determine the final yield in the specified metric units.
 *
 * @param {number} extractPotentialFraction - The fraction of maximum extract potential (e.g., 0.80 for 80%). Must be between 0 and 1.
 * @returns {number} The calculated grain yield in liter*degrees/kg, or NaN if the input is invalid.
 */
export function calculateMetricLiterDegreesPerKg(extractPotentialFraction) {
  // Use the existing metric constant from constants.js
  const maxPotentialExtractMetric = BREW_CONSTANTS.METRIC_POTENTIAL_SCALING_FACTOR; // Uses 386.4 liter*degrees/kg

  // Ensure input is a number between 0 and 1 for valid fractional potential
  if (typeof extractPotentialFraction !== 'number' || extractPotentialFraction < 0 || extractPotentialFraction > 1) {
    console.error("Invalid input: 'extractPotentialFraction' must be a number between 0 and 1.");
    return NaN; // Not a Number for invalid input
  }

  return extractPotentialFraction * maxPotentialExtractMetric;
}

/**
 * Converts Points Per Gallon (PPG) to Liter Degrees Per Kilogram (LDK).
 * Uses the conversion factor derived from the density of water (approx. 8.345 lbs/US gal),
 * where the units are (liters * pounds) / (gallons * kilograms).
 *
 * @param {number} ppg - The value in Points Per Gallon (equivalent to gallons*points/lb).
 * @returns {number} The converted value in Liter Degrees Per Kilogram (LDK).
 */
export function LDKFromPPG(ppg) {
  const conversionFactor = BREW_CONSTANTS.LBS_PER_US_GALLON; // Units: (liters * pounds) / (gallons * kilograms)

  // Ensure input is a number
  if (typeof ppg !== 'number') {
    console.error("Invalid input: 'ppg' must be a number.");
    return NaN;
  }
  return ppg * conversionFactor;
}

/**
 * Converts Liter Degrees Per Kilogram (LDK) to Points Per Gallon (PPG).
 * Uses the conversion factor derived from the density of water (approx. 8.345 lbs/US gal),
 * where the units are (liters * pounds) / (gallons * kilograms).
 *
 * @param {number} ldk - The value in Liter Degrees Per Kilogram (LDK).
 * @returns {number} The converted value in Points Per Gallon (PPG).
 */
export function PPGFromLDK(ldk) {
  const conversionFactor = BREW_CONSTANTS.LBS_PER_US_GALLON; // Units: (liters * pounds) / (gallons * kilograms)

  // Ensure input is a number
  if (typeof ldk !== 'number') {
    console.error("Invalid input: 'ldk' must be a number.");
    return NaN;
  }
  return ldk / conversionFactor;
}
