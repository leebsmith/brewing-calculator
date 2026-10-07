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

function expectClose(actual, expected, tolerance = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `Expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

describe('Pure Functions Tests', () => {

  beforeEach(() => {
    consoleErrorSpy = mock.method(console, 'error', () => {});
  });

  // Tests for grainYieldToImperialGallonPointsPerPound
  describe('grainYieldToImperialGallonPointsPerPound', () => {
    test('should convert 0 extract potential to 0 imperial yield', () => {
      assert.strictEqual(grainYieldToImperialGallonPointsPerPound(0), 0);
    });

    test('should convert 1.0 extract potential to max imperial yield', () => {
      assert.strictEqual(grainYieldToImperialGallonPointsPerPound(1.0), BREW_CONSTANTS.IMPERIAL_POTENTIAL_SCALING_FACTOR);
    });

    test('should correctly convert 0.5 extract potential to imperial yield', () => {
      expectClose(grainYieldToImperialGallonPointsPerPound(0.5), BREW_CONSTANTS.IMPERIAL_POTENTIAL_SCALING_FACTOR / 2);
    });

    test('should return NaN for negative extract potential', () => {
      assert.ok(Number.isNaN(grainYieldToImperialGallonPointsPerPound(-0.1)));
      assert.strictEqual(consoleErrorSpy.mock.callCount(), 1);
      assert.strictEqual(consoleErrorSpy.mock.calls[0].arguments[0], "Invalid input: 'extractPotentialFraction' must be a number between 0 and 1.");
    });

    test('should return NaN for extract potential greater than 1', () => {
      assert.ok(Number.isNaN(grainYieldToImperialGallonPointsPerPound(1.1)));
      assert.strictEqual(consoleErrorSpy.mock.callCount(), 1);
      assert.strictEqual(consoleErrorSpy.mock.calls[0].arguments[0], "Invalid input: 'extractPotentialFraction' must be a number between 0 and 1.");
    });

    test('should return NaN for non-numeric input', () => {
      assert.ok(Number.isNaN(grainYieldToImperialGallonPointsPerPound('abc')));
      assert.strictEqual(consoleErrorSpy.mock.callCount(), 1);
      assert.strictEqual(consoleErrorSpy.mock.calls[0].arguments[0], "Invalid input: 'extractPotentialFraction' must be a number between 0 and 1.");
    });
  });

  // Tests for calculateMetricLiterDegreesPerKg
  describe('calculateMetricLiterDegreesPerKg', () => {
    test('should convert 0 extract potential to 0 metric yield', () => {
      assert.strictEqual(calculateMetricLiterDegreesPerKg(0), 0);
    });

    test('should convert 1.0 extract potential to max metric yield', () => {
      assert.strictEqual(calculateMetricLiterDegreesPerKg(1.0), BREW_CONSTANTS.METRIC_POTENTIAL_SCALING_FACTOR);
    });

    test('should correctly convert 0.5 extract potential to metric yield', () => {
      expectClose(calculateMetricLiterDegreesPerKg(0.5), BREW_CONSTANTS.METRIC_POTENTIAL_SCALING_FACTOR / 2);
    });

    test('should return NaN for negative extract potential', () => {
      assert.ok(Number.isNaN(calculateMetricLiterDegreesPerKg(-0.1)));
      assert.strictEqual(consoleErrorSpy.mock.callCount(), 1);
      assert.strictEqual(consoleErrorSpy.mock.calls[0].arguments[0], "Invalid input: 'extractPotentialFraction' must be a number between 0 and 1.");
    });

    test('should return NaN for extract potential greater than 1', () => {
      assert.ok(Number.isNaN(calculateMetricLiterDegreesPerKg(1.1)));
      assert.strictEqual(consoleErrorSpy.mock.callCount(), 1);
      assert.strictEqual(consoleErrorSpy.mock.calls[0].arguments[0], "Invalid input: 'extractPotentialFraction' must be a number between 0 and 1.");
    });

    test('should return NaN for non-numeric input', () => {
      assert.ok(Number.isNaN(calculateMetricLiterDegreesPerKg('abc')));
      assert.strictEqual(consoleErrorSpy.mock.callCount(), 1);
      assert.strictEqual(consoleErrorSpy.mock.calls[0].arguments[0], "Invalid input: 'extractPotentialFraction' must be a number between 0 and 1.");
    });
  });

  // Tests for LDKFromPPG
  describe('LDKFromPPG', () => {
    test('should correctly convert PPG to LDK', () => {
      expectClose(LDKFromPPG(10), 10 * BREW_CONSTANTS.LDK_PPG_CONVERSION_FACTOR); // 10 * 8.345 = 83.45
    });

    test('should convert 0 PPG to 0 LDK', () => {
      assert.strictEqual(LDKFromPPG(0), 0);
    });

    test('should convert 1 PPG to the conversion factor in LDK', () => {
      assert.strictEqual(LDKFromPPG(1), BREW_CONSTANTS.LDK_PPG_CONVERSION_FACTOR);
    });

    test('should return NaN for negative PPG input', () => {
      assert.ok(Number.isNaN(LDKFromPPG(-5)));
      assert.strictEqual(consoleErrorSpy.mock.callCount(), 1);
      assert.strictEqual(consoleErrorSpy.mock.calls[0].arguments[0], "Invalid input: 'ppg' must be a number.");
    });

    test('should return NaN for non-numeric PPG input', () => {
      assert.ok(Number.isNaN(LDKFromPPG('abc')));
      assert.strictEqual(consoleErrorSpy.mock.callCount(), 1);
      assert.strictEqual(consoleErrorSpy.mock.calls[0].arguments[0], "Invalid input: 'ppg' must be a number.");
    });
  });

  // Tests for PPGFromLDK
  describe('PPGFromLDK', () => {
    test('should correctly convert LDK to PPG', () => {
      expectClose(PPGFromLDK(83.45), 10); // 83.45 / 8.345 = 10
    });

    test('should convert 0 LDK to 0 PPG', () => {
      assert.strictEqual(PPGFromLDK(0), 0);
    });

    test('should convert the conversion factor in LDK to 1 PPG', () => {
      assert.strictEqual(PPGFromLDK(BREW_CONSTANTS.LDK_PPG_CONVERSION_FACTOR), 1);
    });

    test('should return NaN for negative LDK input', () => {
      assert.ok(Number.isNaN(PPGFromLDK(-10)));
      assert.strictEqual(consoleErrorSpy.mock.callCount(), 1);
      assert.strictEqual(consoleErrorSpy.mock.calls[0].arguments[0], "Invalid input: 'ldk' must be a number.");
    });

    test('should return NaN for non-numeric LDK input', () => {
      assert.ok(Number.isNaN(PPGFromLDK('abc')));
      assert.strictEqual(consoleErrorSpy.mock.callCount(), 1);
      assert.strictEqual(consoleErrorSpy.mock.calls[0].arguments[0], "Invalid input: 'ldk' must be a number.");
    });
  });
});
