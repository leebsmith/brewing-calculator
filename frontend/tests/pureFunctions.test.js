/**
 * @file pureFunctions.test.js
 * @description Unit tests for pureFunctions.js
 */

import { test, describe, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

// Import the functions to be tested
import {
  grainYieldToImperialGallonPointsPerPound,
  calculateMetricLiterDegreesPerKg,
  LDKFromPPG,
  PPGFromLDK
} from '../src/utils/pureFunctions.js';

// Mirror of the constants used by the module under test.
const BREW_CONSTANTS = {
  IMPERIAL_POTENTIAL_SCALING_FACTOR: 46.21,
  METRIC_POTENTIAL_SCALING_FACTOR: 386.4,
  LDK_PPG_CONVERSION_FACTOR: 8.345
};

// Spy on console.error so invalid-input tests can assert on the message.
let consoleErrorSpy;

describe('Pure Functions Tests', () => {

  beforeEach(() => {
    consoleErrorSpy = mock.method(console, 'error', () => {});
  });

  // Tests for grainYieldToImperialGallonPointsPerPound
  describe('grainYieldToImperialGallonPointsPerPound', () => {
    test('should convert 0 extract potential to 0 imperial yield', () => {
      expect(grainYieldToImperialGallonPointsPerPound(0)).toBe(0);
    });

    test('should convert 1.0 extract potential to max imperial yield', () => {
      expect(grainYieldToImperialGallonPointsPerPound(1.0)).toBe(BREW_CONSTANTS.IMPERIAL_POTENTIAL_SCALING_FACTOR);
    });

    test('should correctly convert 0.5 extract potential to imperial yield', () => {
      expect(grainYieldToImperialGallonPointsPerPound(0.5)).toBeCloseTo(BREW_CONSTANTS.IMPERIAL_POTENTIAL_SCALING_FACTOR / 2);
    });

    test('should return NaN for negative extract potential', () => {
      expect(grainYieldToImperialGallonPointsPerPound(-0.1)).toBeNaN();
      expect(consoleErrorSpy).toHaveBeenCalledWith("Invalid input: 'extractPotentialFraction' must be a number between 0 and 1.");
    });

    test('should return NaN for extract potential greater than 1', () => {
      expect(grainYieldToImperialGallonPointsPerPound(1.1)).toBeNaN();
      expect(consoleErrorSpy).toHaveBeenCalledWith("Invalid input: 'extractPotentialFraction' must be a number between 0 and 1.");
    });

    test('should return NaN for non-numeric input', () => {
      expect(grainYieldToImperialGallonPointsPerPound('abc')).toBeNaN();
      expect(consoleErrorSpy).toHaveBeenCalledWith("Invalid input: 'extractPotentialFraction' must be a number between 0 and 1.");
    });
  });

  // Tests for calculateMetricLiterDegreesPerKg
  describe('calculateMetricLiterDegreesPerKg', () => {
    test('should convert 0 extract potential to 0 metric yield', () => {
      expect(calculateMetricLiterDegreesPerKg(0)).toBe(0);
    });

    test('should convert 1.0 extract potential to max metric yield', () => {
      expect(calculateMetricLiterDegreesPerKg(1.0)).toBe(BREW_CONSTANTS.METRIC_POTENTIAL_SCALING_FACTOR);
    });

    test('should correctly convert 0.5 extract potential to metric yield', () => {
      expect(calculateMetricLiterDegreesPerKg(0.5)).toBeCloseTo(BREW_CONSTANTS.METRIC_POTENTIAL_SCALING_FACTOR / 2);
    });

    test('should return NaN for negative extract potential', () => {
      expect(calculateMetricLiterDegreesPerKg(-0.1)).toBeNaN();
      expect(consoleErrorSpy).toHaveBeenCalledWith("Invalid input: 'extractPotentialFraction' must be a number between 0 and 1.");
    });

    test('should return NaN for extract potential greater than 1', () => {
      expect(calculateMetricLiterDegreesPerKg(1.1)).toBeNaN();
      expect(consoleErrorSpy).toHaveBeenCalledWith("Invalid input: 'extractPotentialFraction' must be a number between 0 and 1.");
    });

    test('should return NaN for non-numeric input', () => {
      expect(calculateMetricLiterDegreesPerKg('abc')).toBeNaN();
      expect(consoleErrorSpy).toHaveBeenCalledWith("Invalid input: 'extractPotentialFraction' must be a number between 0 and 1.");
    });
  });

  // Tests for LDKFromPPG
  describe('LDKFromPPG', () => {
    test('should correctly convert PPG to LDK', () => {
      expect(LDKFromPPG(10)).toBeCloseTo(10 * BREW_CONSTANTS.LDK_PPG_CONVERSION_FACTOR); // 10 * 8.345 = 83.45
    });

    test('should convert 0 PPG to 0 LDK', () => {
      expect(LDKFromPPG(0)).toBe(0);
    });

    test('should convert 1 PPG to the conversion factor in LDK', () => {
      expect(LDKFromPPG(1)).toBe(BREW_CONSTANTS.LDK_PPG_CONVERSION_FACTOR);
    });

    test('should return NaN for negative PPG input', () => {
      expect(LDKFromPPG(-5)).toBeNaN();
      expect(consoleErrorSpy).toHaveBeenCalledWith("Invalid input: 'ppg' must be a number.");
    });

    test('should return NaN for non-numeric PPG input', () => {
      expect(LDKFromPPG('abc')).toBeNaN();
      expect(consoleErrorSpy).toHaveBeenCalledWith("Invalid input: 'ppg' must be a number.");
    });
  });

  // Tests for PPGFromLDK
  describe('PPGFromLDK', () => {
    test('should correctly convert LDK to PPG', () => {
      expect(PPGFromLDK(83.45)).toBeCloseTo(10); // 83.45 / 8.345 = 10
    });

    test('should convert 0 LDK to 0 PPG', () => {
      expect(PPGFromLDK(0)).toBe(0);
    });

    test('should convert the conversion factor in LDK to 1 PPG', () => {
      expect(PPGFromLDK(BREW_CONSTANTS.LDK_PPG_CONVERSION_FACTOR)).toBe(1);
    });

    test('should return NaN for negative LDK input', () => {
      expect(PPGFromLDK(-10)).toBeNaN();
      expect(consoleErrorSpy).toHaveBeenCalledWith("Invalid input: 'ldk' must be a number.");
    });

    test('should return NaN for non-numeric LDK input', () => {
      expect(PPGFromLDK('abc')).toBeNaN();
      expect(consoleErrorSpy).toHaveBeenCalledWith("Invalid input: 'ldk' must be a number.");
    });
  });
});
