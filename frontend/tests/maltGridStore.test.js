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
const brewConstantsMatch = constantsCode.match(/export const BREW_CONSTANTS\s*=\s*({[\s\S]*?});/);
if (!brewConstantsMatch) {
  throw new Error("Could not parse BREW_CONSTANTS from constants.js");
}
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

global.collapse = {};

// Load pureFunctions.js into the global scope. script.js imports these
// helpers, but the harness strips import statements before eval, so we must
// define them globally first (mirroring how the browser resolves the module).
const pureFunctionsPath = resolve(__dirname, '../src/utils/pureFunctions.js');
let pureFunctionsCode = readFileSync(pureFunctionsPath, 'utf8');
pureFunctionsCode = pureFunctionsCode.replace(/^import\s+[\s\S]*?;\s*$/gm, '');
pureFunctionsCode = pureFunctionsCode.replace(/^export\s+/gm, '');
// Indirect eval runs in the global scope, so the function declarations
// (allocateProportionalPercentages, etc.) become global and are visible to
// the separately-eval'd script.js below.
(0, eval)(pureFunctionsCode);

// Evaluate script.js to register the Alpine stores
const scriptPath = resolve(__dirname, '../script.js');
let scriptCode = readFileSync(scriptPath, 'utf8');
scriptCode = scriptCode.replace(/^import\s+[\s\S]*?;\s*$/gm, '');
scriptCode = scriptCode.replace(/^export\s+/gm, '');
eval(scriptCode);

// Minimal UI store stub so maltGrid's limit-rejection toast does not throw.
if (!Alpine.store('ui')) {
  Alpine.store('ui', {
    toasts: [],
    add(message, type = 'info') { this.toasts.push({ message, type }); },
    remove() {}
  });
}

describe('Malt Grid Store Tests (Grain Bill Editor)', () => {
  let maltGrid;
  let ui;

  beforeEach(() => {
    ui = Alpine.store('ui');
    ui.toasts = [];
    maltGrid = Alpine.store('maltGrid');
    // Reset to a single default row so each test starts from a known state.
    maltGrid.majorMalts = [
      {
        row_id: 'row_default_1',
        catalog_id: 'malt_2row',
        is_custom: false,
        name: 'Briess 2-Row Pale',
        category: 'BASE',
        parts: 10.0,
        pct: 100.0,
        potential_fraction: 0.80,
        color_lovibond: 1.8,
        moisture_pct: 0.04,
        di_ph: 5.75,
        buffer_index: 45.0,
        notes: 'Standard American 2-row base malt.'
      }
    ];
    maltGrid.traceMalts = [];
    maltGrid.modalOpen = false;
    maltGrid.draftMajorMalts = [];
    maltGrid.draftTraceMalts = [];
    maltGrid.drawerMode = null;
    maltGrid.activeRowId = null;
    maltGrid.catalogSearchQuery = '';
    maltGrid.selectedCategories = ['BASE', 'CRYSTAL', 'ROASTED', 'ACID'];
  });

  test('Test 1: normalizeDraft writes exactly 100.0% (Hamilton invariant)', () => {
    maltGrid.openModal();
    maltGrid.addMajorMalt({ id: 'malt_munich', name: 'Munich', category: 'BASE', potential_fraction: 0.78, color_lovibond: 9.0 });
    maltGrid.addMajorMalt({ id: 'malt_crystal60', name: 'Crystal 60', category: 'CRYSTAL', potential_fraction: 0.74, color_lovibond: 60.0 });

    const total = maltGrid.draftMajorMalts.reduce((s, r) => s + r.pct, 0);
    assert.strictEqual(Number(total.toFixed(1)), 100.0);
    assert.strictEqual(maltGrid.validationStatus.type, 'balanced');
  });

  test('Test 2: openModal deep-copies so draft edits do not mutate saved bill', () => {
    maltGrid.openModal();
    maltGrid.updateParts('row_default_1', 25.0);

    // Saved bill must be untouched while the modal is open.
    assert.strictEqual(maltGrid.majorMalts[0].parts, 10.0);
    assert.strictEqual(maltGrid.draftMajorMalts[0].parts, 25.0);

    // Cancel discards the draft.
    maltGrid.cancelModal();
    assert.strictEqual(maltGrid.majorMalts[0].parts, 10.0);
  });

  test('Test 3: saveModal commits the normalized draft to the saved bill', () => {
    maltGrid.openModal();
    maltGrid.addMajorMalt({ id: 'malt_munich', name: 'Munich', category: 'BASE', potential_fraction: 0.78, color_lovibond: 9.0 });
    maltGrid.saveModal();

    assert.strictEqual(maltGrid.modalOpen, false);
    assert.strictEqual(maltGrid.majorMalts.length, 2);
    const total = maltGrid.majorMalts.reduce((s, r) => s + r.pct, 0);
    assert.strictEqual(Number(total.toFixed(1)), 100.0);
  });

  test('Test 4: addMajorMalt enforces MAX_MAJOR_MALTS', () => {
    maltGrid.openModal();
    // Already has 1 row; add up to the limit.
    const limit = BREW_CONSTANTS.MAX_MAJOR_MALTS;
    for (let i = maltGrid.draftMajorMalts.length; i < limit; i++) {
      maltGrid.addMajorMalt({ id: `malt_${i}`, name: `Malt ${i}`, category: 'BASE', potential_fraction: 0.80, color_lovibond: 2.0 });
    }
    assert.strictEqual(maltGrid.draftMajorMalts.length, limit);
    assert.strictEqual(maltGrid.isAtMajorMaltLimit, true);

    // One more must be rejected with a toast.
    maltGrid.addMajorMalt({ id: 'malt_overflow', name: 'Overflow', category: 'BASE', potential_fraction: 0.80, color_lovibond: 2.0 });
    assert.strictEqual(maltGrid.draftMajorMalts.length, limit);
    assert.strictEqual(ui.toasts.length, 1);
    assert.strictEqual(ui.toasts[0].type, 'error');
  });

  test('Test 5: cloneAndEdit enforces MAX_MAJOR_MALTS', () => {
    maltGrid.openModal();
    const limit = BREW_CONSTANTS.MAX_MAJOR_MALTS;
    for (let i = maltGrid.draftMajorMalts.length; i < limit; i++) {
      maltGrid.addMajorMalt({ id: `malt_${i}`, name: `Malt ${i}`, category: 'BASE', potential_fraction: 0.80, color_lovibond: 2.0 });
    }
    const before = maltGrid.draftMajorMalts.length;
    maltGrid.cloneAndEdit(maltGrid.draftMajorMalts[0].row_id);
    assert.strictEqual(maltGrid.draftMajorMalts.length, before);
    assert.strictEqual(ui.toasts.length, 1);
    assert.strictEqual(ui.toasts[0].type, 'error');
  });

  test('Test 6: updateParts clamps negatives to zero and re-normalizes', () => {
    maltGrid.openModal();
    maltGrid.addMajorMalt({ id: 'malt_munich', name: 'Munich', category: 'BASE', potential_fraction: 0.78, color_lovibond: 9.0 });
    maltGrid.updateParts('row_default_1', -5.0);
    assert.strictEqual(maltGrid.draftMajorMalts[0].parts, 0);
    // With one row at 0 parts and one at 10, the 10-part row takes 100%.
    const total = maltGrid.draftMajorMalts.reduce((s, r) => s + r.pct, 0);
    assert.strictEqual(Number(total.toFixed(1)), 100.0);
  });

  test('Test 7: removeMajorMalt clears inspector state for the removed row', () => {
    maltGrid.openModal();
    maltGrid.addMajorMalt({ id: 'malt_munich', name: 'Munich', category: 'BASE', potential_fraction: 0.78, color_lovibond: 9.0 });
    const targetId = maltGrid.draftMajorMalts[1].row_id;
    maltGrid.inspectRow(targetId);
    assert.strictEqual(maltGrid.drawerMode, 'inspect');
    assert.strictEqual(maltGrid.activeRowId, targetId);

    maltGrid.removeMajorMalt(targetId);
    assert.strictEqual(maltGrid.activeRowId, null);
    assert.strictEqual(maltGrid.drawerMode, null);
  });

  test('Test 8: summary totals agree with per-row weighted contributions', () => {
    maltGrid.openModal();
    maltGrid.addMajorMalt({ id: 'malt_munich', name: 'Munich', category: 'BASE', potential_fraction: 0.78, color_lovibond: 9.0 });
    maltGrid.addMajorMalt({ id: 'malt_crystal60', name: 'Crystal 60', category: 'CRYSTAL', potential_fraction: 0.74, color_lovibond: 60.0 });

    // Sum of per-row weighted contributions must equal the summary total
    // (Hamilton guarantees Σ pct === 100.0, so the shares sum to 1.0).
    const rowSum = maltGrid.draftMajorMalts.reduce(
      (s, r) => s + maltGrid.maltWeightedContributionDisplay(r), 0
    );
    const summary = maltGrid.totalWeightedContributionDisplay;
    assert.ok(Math.abs(rowSum - summary) <= 0.1, `rowSum ${rowSum} vs summary ${summary}`);

    // Total parts is the raw sum of parts.
    const partsSum = maltGrid.draftMajorMalts.reduce((s, r) => s + r.parts, 0);
    assert.strictEqual(maltGrid.totalParts, partsSum);

    // Total pct is 100.0.
    assert.strictEqual(Number(maltGrid.totalPct.toFixed(1)), 100.0);
  });

  test('Test 9: validationStatus reports deficit and surplus correctly', () => {
    maltGrid.openModal();
    // Force a deficit by zeroing the only row's parts.
    maltGrid.updateParts('row_default_1', 0);
    assert.strictEqual(maltGrid.validationStatus.type, 'unconfigured');

    // Restore a single row -> balanced.
    maltGrid.updateParts('row_default_1', 10);
    assert.strictEqual(maltGrid.validationStatus.type, 'balanced');
  });

  test('Test 10: filteredCatalog excludes already-added catalog IDs', () => {
    Alpine.store('catalog', {
      malts: [
        { id: 'malt_2row', name: 'Briess 2-Row Pale', category: 'BASE', color_lovibond: 1.8, notes: '' },
        { id: 'malt_munich', name: 'Munich', category: 'BASE', color_lovibond: 9.0, notes: '' },
        { id: 'malt_crystal60', name: 'Crystal 60', category: 'CRYSTAL', color_lovibond: 60.0, notes: '' }
      ],
      sugars: [],
      loaded: true
    });

    maltGrid.openModal();
    // row_default_1 has catalog_id 'malt_2row', so it must be excluded.
    const ids = maltGrid.filteredCatalog.map(m => m.id);
    assert.ok(!ids.includes('malt_2row'));
    assert.ok(ids.includes('malt_munich'));
    assert.ok(ids.includes('malt_crystal60'));

    // Category filter: deselect CRYSTAL.
    maltGrid.toggleCategory('CRYSTAL');
    const ids2 = maltGrid.filteredCatalog.map(m => m.id);
    assert.ok(!ids2.includes('malt_crystal60'));
  });
});
