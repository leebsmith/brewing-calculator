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
  PPGFromLDK,
  isTracePercentage,
  allocateProportionalPercentages
} from '../src/utils/pureFunctions.js';

import {
  C_GRAIN_KCAL_PER_KG_C,
  CANONICAL_RESTS,
  DOUGH_IN_REST,
  MASH_OUT_REST,
  MASH_PRESETS,
  BRAUKAISER_BASE_ATTENUATION_PCT,
  BRAUKAISER_BASE_TEMP_C,
  BRAUKAISER_DROP_PER_C,
  BRAUKAISER_LOA_MIN_PCT,
  BRAUKAISER_LOA_MAX_PCT,
  getCanonicalRest,
  canonicalOrderIndex,
  sortRestsByTemperature,
  calculateStrikeWaterTempC,
  isRestTempOutOfRange,
  estimateSingleRestLoaPct,
  estimateLimitOfAttenuation,
  createDefaultMashSchedule,
  applyMashPreset,
  markScheduleCustom
} from '../src/utils/mashSchedule.js';

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

  // Tests for isTracePercentage
  describe('isTracePercentage', () => {
    test('should return true for percentages below 2%', () => {
      assert.strictEqual(isTracePercentage(0), true);
      assert.strictEqual(isTracePercentage(1.9), true);
    });

    test('should return false for percentages at or above 2%', () => {
      assert.strictEqual(isTracePercentage(2.0), false);
      assert.strictEqual(isTracePercentage(50.0), false);
    });

    test('should return false for non-numeric input', () => {
      assert.strictEqual(isTracePercentage('abc'), false);
      assert.strictEqual(isTracePercentage(null), false);
    });
  });

  // Tests for allocateProportionalPercentages
  describe('allocateProportionalPercentages', () => {
    test('should return an empty array for empty input', () => {
      assert.deepStrictEqual(allocateProportionalPercentages([]), []);
      assert.deepStrictEqual(allocateProportionalPercentages(null), []);
    });

    test('should return all zeros when total parts is zero', () => {
      const result = allocateProportionalPercentages([{ parts: 0 }, { parts: 0 }]);
      assert.deepStrictEqual(result, [0.0, 0.0]);
    });

    test('should allocate a single row to exactly 100%', () => {
      const result = allocateProportionalPercentages([{ parts: 10 }]);
      assert.deepStrictEqual(result, [100.0]);
    });

    test('should allocate equal parts evenly', () => {
      const result = allocateProportionalPercentages([{ parts: 1 }, { parts: 1 }]);
      assert.deepStrictEqual(result, [50.0, 50.0]);
    });

    test('should always sum to exactly 100.0%', () => {
      const rows = [{ parts: 1 }, { parts: 1 }, { parts: 1 }];
      const result = allocateProportionalPercentages(rows);
      const sum = result.reduce((a, b) => a + b, 0);
      expectClose(sum, 100.0, 1e-9);
    });

    test('should break remainder ties by larger parts, then index', () => {
      // 1/3 each -> 33.3, 33.3, 33.3 with one +0.1 remainder to distribute.
      const result = allocateProportionalPercentages([{ parts: 1 }, { parts: 1 }, { parts: 1 }]);
      const sum = result.reduce((a, b) => a + b, 0);
      expectClose(sum, 100.0, 1e-9);
      // Deterministic: first index wins the tie.
      assert.deepStrictEqual(result, [33.4, 33.3, 33.3]);
    });

    test('should not mutate the input rows', () => {
      const rows = [{ parts: 3 }, { parts: 7 }];
      const snapshot = JSON.parse(JSON.stringify(rows));
      allocateProportionalPercentages(rows);
      assert.deepStrictEqual(rows, snapshot);
    });

    test('should treat negative parts as zero', () => {
      const result = allocateProportionalPercentages([{ parts: -5 }, { parts: 10 }]);
      assert.deepStrictEqual(result, [0.0, 100.0]);
    });
  });

  // Tests for mashSchedule.js
  describe('mashSchedule', () => {

    describe('calculateStrikeWaterTempC', () => {
      test('should return the target temperature when grain is at target', () => {
        // When T_target === T_grain, the correction term is zero.
        assert.strictEqual(calculateStrikeWaterTempC(66, 66, 2.6), 66);
      });

      test('should apply the metric C_grain constant', () => {
        // T_strike = 66 + (0.41 / 2.6) * (66 - 20)
        const expected = 66 + (C_GRAIN_KCAL_PER_KG_C / 2.6) * (66 - 20);
        expectClose(calculateStrikeWaterTempC(66, 20, 2.6), expected);
      });

      test('should return a higher strike temp for a thinner mash', () => {
        const thick = calculateStrikeWaterTempC(66, 20, 2.0);
        const thin = calculateStrikeWaterTempC(66, 20, 4.0);
        assert.ok(thick > thin, 'thicker mash needs hotter strike water');
      });

      test('should return NaN for a non-positive mash thickness', () => {
        assert.ok(Number.isNaN(calculateStrikeWaterTempC(66, 20, 0)));
        assert.ok(Number.isNaN(calculateStrikeWaterTempC(66, 20, -1)));
        assert.strictEqual(consoleErrorSpy.mock.callCount(), 2);
      });

      test('should return NaN for non-numeric inputs', () => {
        assert.ok(Number.isNaN(calculateStrikeWaterTempC('abc', 20, 2.6)));
        assert.strictEqual(consoleErrorSpy.mock.callCount(), 1);
      });
    });

    describe('sortRestsByTemperature', () => {
      test('should sort enabled rests into ascending temperature order', () => {
        const rests = [
          { rest_id: 'alpha_amylase', use_temp_c: 70 },
          { rest_id: 'protein', use_temp_c: 52 },
          { rest_id: 'beta_amylase', use_temp_c: 63 },
        ];
        const sorted = sortRestsByTemperature(rests);
        assert.deepStrictEqual(
          sorted.map((r) => r.rest_id),
          ['protein', 'beta_amylase', 'alpha_amylase']
        );
      });

      test('should break temperature ties by canonical order', () => {
        const rests = [
          { rest_id: 'alpha_amylase', use_temp_c: 65 },
          { rest_id: 'beta_amylase', use_temp_c: 65 },
        ];
        const sorted = sortRestsByTemperature(rests);
        // beta_amylase precedes alpha_amylase in canonical order.
        assert.deepStrictEqual(
          sorted.map((r) => r.rest_id),
          ['beta_amylase', 'alpha_amylase']
        );
      });

      test('should sort null-temperature rests after those with a temperature', () => {
        const rests = [
          { rest_id: 'dough_in', use_temp_c: null },
          { rest_id: 'protein', use_temp_c: 52 },
        ];
        const sorted = sortRestsByTemperature(rests);
        assert.deepStrictEqual(
          sorted.map((r) => r.rest_id),
          ['protein', 'dough_in']
        );
      });

      test('should not mutate the input array', () => {
        const rests = [
          { rest_id: 'alpha_amylase', use_temp_c: 70 },
          { rest_id: 'protein', use_temp_c: 52 },
        ];
        const snapshot = JSON.parse(JSON.stringify(rests));
        sortRestsByTemperature(rests);
        assert.deepStrictEqual(rests, snapshot);
      });
    });

    describe('canonicalOrderIndex', () => {
      test('should place dough-in first and mash-out last', () => {
        assert.ok(canonicalOrderIndex('dough_in') < canonicalOrderIndex('phytase'));
        assert.ok(canonicalOrderIndex('mash_out') > canonicalOrderIndex('beta_alpha_amylase'));
      });
    });

    describe('getCanonicalRest', () => {
      test('should resolve bookends and canonical rests', () => {
        assert.strictEqual(getCanonicalRest('dough_in'), DOUGH_IN_REST);
        assert.strictEqual(getCanonicalRest('mash_out'), MASH_OUT_REST);
        assert.strictEqual(getCanonicalRest('protein').name, 'Protein Rest');
      });

      test('should return null for an unknown rest id', () => {
        assert.strictEqual(getCanonicalRest('nope'), null);
      });
    });

    describe('isRestTempOutOfRange', () => {
      test('should flag a value below the recommended range', () => {
        assert.strictEqual(isRestTempOutOfRange('protein', 45), true);
      });

      test('should flag a value above the recommended range', () => {
        assert.strictEqual(isRestTempOutOfRange('protein', 60), true);
      });

      test('should not flag a value inside the range', () => {
        assert.strictEqual(isRestTempOutOfRange('protein', 52), false);
      });

      test('should not flag dough-in (no recommended range)', () => {
        assert.strictEqual(isRestTempOutOfRange('dough_in', 999), false);
      });

      test('should not flag a null temperature', () => {
        assert.strictEqual(isRestTempOutOfRange('protein', null), false);
      });
    });

    describe('estimateSingleRestLoaPct', () => {
      test('should return the baseline attenuation at the base temperature', () => {
        assert.strictEqual(
          estimateSingleRestLoaPct(BRAUKAISER_BASE_TEMP_C),
          BRAUKAISER_BASE_ATTENUATION_PCT
        );
      });

      test('should drop by the per-degree constant above the base temperature', () => {
        const expected = BRAUKAISER_BASE_ATTENUATION_PCT - BRAUKAISER_DROP_PER_C;
        assert.strictEqual(estimateSingleRestLoaPct(BRAUKAISER_BASE_TEMP_C + 1), expected);
      });

      test('should clamp to the minimum at high temperatures', () => {
        assert.strictEqual(estimateSingleRestLoaPct(100), BRAUKAISER_LOA_MIN_PCT);
      });

      test('should clamp to the maximum at low temperatures', () => {
        assert.strictEqual(estimateSingleRestLoaPct(0), BRAUKAISER_LOA_MAX_PCT);
      });

      test('should return NaN for non-numeric input', () => {
        assert.ok(Number.isNaN(estimateSingleRestLoaPct('abc')));
        assert.strictEqual(consoleErrorSpy.mock.callCount(), 1);
      });
    });

    describe('estimateLimitOfAttenuation', () => {
      test('should return NaN when no saccharification rest is enabled', () => {
        const rests = [
          { rest_id: 'protein', enabled: true, use_temp_c: 52, duration_min: 20 },
        ];
        assert.ok(Number.isNaN(estimateLimitOfAttenuation(rests)));
      });

      test('should return a higher LOA for a beta-amylase rest than an alpha rest', () => {
        const beta = estimateLimitOfAttenuation([
          { rest_id: 'beta_amylase', enabled: true, use_temp_c: 63, duration_min: 60 },
        ]);
        const alpha = estimateLimitOfAttenuation([
          { rest_id: 'alpha_amylase', enabled: true, use_temp_c: 72, duration_min: 60 },
        ]);
        assert.ok(beta > alpha, 'beta rest should yield higher attenuation');
      });

      test('should return the Braukaiser baseline as a fraction at 63 C', () => {
        const loa = estimateLimitOfAttenuation([
          { rest_id: 'beta_amylase', enabled: true, use_temp_c: 63, duration_min: 60 },
        ]);
        expectClose(loa, BRAUKAISER_BASE_ATTENUATION_PCT / 100.0);
      });

      test('should duration-weight multiple saccharification rests', () => {
        // 30 min at 63 C (82%) + 30 min at 65 C (75%) -> 78.5% -> 0.785
        const loa = estimateLimitOfAttenuation([
          { rest_id: 'beta_amylase', enabled: true, use_temp_c: 63, duration_min: 30 },
          { rest_id: 'alpha_amylase', enabled: true, use_temp_c: 65, duration_min: 30 },
        ]);
        expectClose(loa, 0.785);
      });

      test('should stay within the Braukaiser clamp band', () => {
        const loa = estimateLimitOfAttenuation([
          { rest_id: 'beta_alpha_amylase', enabled: true, use_temp_c: 66, duration_min: 60 },
        ]);
        assert.ok(loa >= BRAUKAISER_LOA_MIN_PCT / 100.0 && loa <= BRAUKAISER_LOA_MAX_PCT / 100.0);
      });
    });

    describe('createDefaultMashSchedule', () => {
      test('should include dough-in and mash-out as enabled bookends', () => {
        const schedule = createDefaultMashSchedule();
        const doughIn = schedule.rests.find((r) => r.rest_id === 'dough_in');
        const mashOut = schedule.rests.find((r) => r.rest_id === 'mash_out');
        assert.strictEqual(doughIn.enabled, true);
        assert.strictEqual(mashOut.enabled, true);
      });

      test('should include every canonical rest, disabled by default', () => {
        const schedule = createDefaultMashSchedule();
        for (const rest of CANONICAL_RESTS) {
          const entry = schedule.rests.find((r) => r.rest_id === rest.rest_id);
          assert.ok(entry, `missing ${rest.rest_id}`);
          assert.strictEqual(entry.enabled, false);
        }
      });

      test('should default grain_temp_c to 20.0 and preset_id to custom', () => {
        const schedule = createDefaultMashSchedule();
        assert.strictEqual(schedule.grain_temp_c, 20.0);
        assert.strictEqual(schedule.preset_id, 'custom');
      });
    });

    describe('applyMashPreset', () => {
      test('should enable exactly the preset rests', () => {
        const schedule = createDefaultMashSchedule();
        const applied = applyMashPreset(schedule, 'german_pils');
        const enabled = applied.rests.filter((r) => r.enabled).map((r) => r.rest_id).sort();
        assert.deepStrictEqual(enabled, ['beta_amylase', 'alpha_amylase', 'dough_in', 'mash_out'].sort());
      });

      test('should not add or remove array entries', () => {
        const schedule = createDefaultMashSchedule();
        const applied = applyMashPreset(schedule, 'belgian_saison');
        assert.strictEqual(applied.rests.length, schedule.rests.length);
      });

      test('should preserve a user-set temperature across preset switches', () => {
        const schedule = createDefaultMashSchedule();
        const protein = schedule.rests.find((r) => r.rest_id === 'protein');
        protein.use_temp_c = 51.5;
        const applied = applyMashPreset(schedule, 'belgian_saison');
        const appliedProtein = applied.rests.find((r) => r.rest_id === 'protein');
        assert.strictEqual(appliedProtein.use_temp_c, 51.5);
      });

      test('should return the input unchanged for an unknown preset', () => {
        const schedule = createDefaultMashSchedule();
        const result = applyMashPreset(schedule, 'nope');
        assert.strictEqual(result, schedule);
        assert.strictEqual(consoleErrorSpy.mock.callCount(), 1);
      });

      test('should not mutate the input schedule', () => {
        const schedule = createDefaultMashSchedule();
        const snapshot = JSON.parse(JSON.stringify(schedule));
        applyMashPreset(schedule, 'german_pils');
        assert.deepStrictEqual(schedule, snapshot);
      });
    });

    describe('markScheduleCustom', () => {
      test('should flip a named preset to custom', () => {
        const schedule = { preset_id: 'german_pils', rests: [] };
        assert.strictEqual(markScheduleCustom(schedule).preset_id, 'custom');
      });

      test('should return the same object when already custom', () => {
        const schedule = { preset_id: 'custom', rests: [] };
        assert.strictEqual(markScheduleCustom(schedule), schedule);
      });
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
