import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simulate browser environment for Alpine and constants
global.window = global;
global.localStorage = {
  store: {},
  getItem(key) { return this.store[key] || null; },
  setItem(key, value) { this.store[key] = value; },
  clear() { this.store = {}; }
};

// Load constants to populate global.BREW_CONSTANTS
const constantsPath = resolve(__dirname, '../constants.js');
const constantsCode = readFileSync(constantsPath, 'utf8');
// Naive extraction of export const BREW_CONSTANTS
const brewConstantsMatch = constantsCode.match(/export const BREW_CONSTANTS\s*=\s*({[\s\S]*?});/);
if (!brewConstantsMatch) {
  throw new Error("Could not parse BREW_CONSTANTS from constants.js");
}
// Evaluate the object strictly as a Javascript object
global.BREW_CONSTANTS = eval(`(${brewConstantsMatch[1]})`);

// Mock Alpine
const alpineStoreMap = {};
global.Alpine = {
  store(name, data) {
    if (data === undefined) return alpineStoreMap[name];
    alpineStoreMap[name] = data;
  },
  plugin() {},
  data() {},
  start() {}
};

// Mock the imported 'collapse' and other plugins if needed
global.collapse = {};

// Evaluate script.js to register the Alpine store
const scriptPath = resolve(__dirname, '../script.js');
let scriptCode = readFileSync(scriptPath, 'utf8');
// Strip out ESM imports and exports so we can safely eval the file.
// The `s` (dotAll) flag is required so multi-line import statements
// (e.g. `import {\n  a,\n  b,\n} from '...';`) are matched and removed.
scriptCode = scriptCode.replace(/^import\s+[\s\S]*?;\s*$/gm, '');
scriptCode = scriptCode.replace(/^export\s+/gm, '');

// Execute script in global context to register Alpine.store('units', ...)
eval(scriptCode);

describe('Unit System Architecture Tests (Phase 4)', () => {
  let unitsStore;

  beforeEach(() => {
    // Reset localStorage
    global.localStorage.clear();
    // Retrieve fresh instance of the store and reset its state
    unitsStore = Alpine.store('units');
    unitsStore.globalMode = BREW_CONSTANTS.UNIT_MODES.METRIC;
    unitsStore.overrides = {};
    unitsStore.isReady = true;
    unitsStore.isSaving = false;
  });

  test('Test 1: Default State', () => {
    assert.strictEqual(unitsStore.globalMode, BREW_CONSTANTS.UNIT_MODES.METRIC);
    assert.strictEqual(unitsStore.isPureMetric(), true);
    assert.strictEqual(unitsStore.overrideCount, 0);
    assert.strictEqual(unitsStore.getFieldUnit('step1_max_kettle_volume_l'), 'L');
  });

  test('Test 2: Single Field Toggle in Metric', () => {
    unitsStore.toggle('step1_max_kettle_volume_l');
    
    assert.strictEqual(unitsStore.getFieldUnit('step1_max_kettle_volume_l'), 'gal');
    assert.strictEqual(unitsStore.isCustomized('step1_max_kettle_volume_l'), true);
    assert.strictEqual(unitsStore.isMixedMetric(), true);
    assert.strictEqual(unitsStore.isPureMetric(), false);
    assert.strictEqual(unitsStore.overrideCount, 1);
  });

  test('Test 3: Infinite Toggle Symmetry (Metric Mode)', () => {
    // 10 toggle cycles
    for (let i = 0; i < 10; i++) {
      unitsStore.toggle('step1_max_kettle_volume_l');
      assert.strictEqual(unitsStore.getFieldUnit('step1_max_kettle_volume_l'), 'gal');
      assert.strictEqual(unitsStore.isMixedMetric(), true);
      
      unitsStore.toggle('step1_max_kettle_volume_l');
      assert.strictEqual(unitsStore.getFieldUnit('step1_max_kettle_volume_l'), 'L');
      assert.strictEqual(unitsStore.isPureMetric(), true);
    }
  });

  test('Test 4: Imperial Mode Stability', () => {
    unitsStore.globalMode = BREW_CONSTANTS.UNIT_MODES.IMPERIAL;
    assert.strictEqual(unitsStore.isPureImperial(), true);
    assert.strictEqual(unitsStore.getFieldUnit('step1_max_kettle_volume_l'), 'gal');
    
    // 10 toggle cycles in Imperial
    for (let i = 0; i < 10; i++) {
      unitsStore.toggle('step1_max_kettle_volume_l');
      assert.strictEqual(unitsStore.getFieldUnit('step1_max_kettle_volume_l'), 'L');
      assert.strictEqual(unitsStore.isMixedImperial(), true);
      
      unitsStore.toggle('step1_max_kettle_volume_l');
      assert.strictEqual(unitsStore.getFieldUnit('step1_max_kettle_volume_l'), 'gal');
      assert.strictEqual(unitsStore.isPureImperial(), true);
    }
  });

  test('Test 5: Case B Reset (Tinted Click)', () => {
    unitsStore.globalMode = BREW_CONSTANTS.UNIT_MODES.IMPERIAL;
    unitsStore.toggle('step1_max_kettle_volume_l');
    unitsStore.toggle('step2_preboil_gravity');
    
    assert.strictEqual(unitsStore.isMixedImperial(), true);
    
    // Clicking active tinted button resets overrides
    unitsStore.handleModeClick(BREW_CONSTANTS.UNIT_MODES.IMPERIAL);
    
    assert.strictEqual(unitsStore.isPureImperial(), true);
    assert.strictEqual(unitsStore.overrideCount, 0);
  });

  test('Test 6: Case C Preset Switch (Ghost Click)', () => {
    unitsStore.globalMode = BREW_CONSTANTS.UNIT_MODES.IMPERIAL;
    unitsStore.toggle('step1_max_kettle_volume_l');
    
    // Clicking inactive ghost button switches mode and clears overrides
    unitsStore.handleModeClick(BREW_CONSTANTS.UNIT_MODES.METRIC);
    
    assert.strictEqual(unitsStore.globalMode, BREW_CONSTANTS.UNIT_MODES.METRIC);
    assert.strictEqual(unitsStore.isPureMetric(), true);
    assert.strictEqual(unitsStore.overrideCount, 0);
  });

  test('Test 7: Percentage Invariant', () => {
    assert.strictEqual(unitsStore.getFieldUnit('step1_conversion_efficiency'), '%');
    
    unitsStore.toggle('step1_conversion_efficiency');
    assert.strictEqual(unitsStore.getFieldUnit('step1_conversion_efficiency'), 'fraction');
    assert.strictEqual(unitsStore.isCustomized('step1_conversion_efficiency'), true);
    assert.strictEqual(unitsStore.overrideCount, 1);
    
    unitsStore.toggle('step1_conversion_efficiency');
    assert.strictEqual(unitsStore.getFieldUnit('step1_conversion_efficiency'), '%');
    assert.strictEqual(unitsStore.isCustomized('step1_conversion_efficiency'), false);
    assert.strictEqual(unitsStore.overrideCount, 0);
  });

  test('Test 8: Sparse Serialization & Hydration Sanitization', () => {
    const rawPayload = {
      globalMode: 1, // Imperial
      overrides: {
        'step1_max_kettle_volume_l': 0, // Valid Metric override
        'invalid_legacy_field': 1,      // Should be purged
        'step2_preboil_gravity': 2      // Invalid bit, should be purged
      }
    };
    
    const sanitized = unitsStore.sanitize(rawPayload);
    
    assert.strictEqual(sanitized.globalMode, 1);
    assert.ok('step1_max_kettle_volume_l' in sanitized.overrides);
    assert.strictEqual(sanitized.overrides['step1_max_kettle_volume_l'], 0);
    assert.ok(!('invalid_legacy_field' in sanitized.overrides));
    assert.ok(!('step2_preboil_gravity' in sanitized.overrides));
  });
});
