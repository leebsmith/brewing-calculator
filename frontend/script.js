/**
 * Frontend application logic for Mono-Repo Default.
 * Registers Alpine.js global auth store and components for API interactions.
 */

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBBuDb_MHITk-wNTvwbiklhrRxFGEi04P4",
  authDomain: "batch-brewing-calculator.firebaseapp.com",
  projectId: "batch-brewing-calculator",
  storageBucket: "batch-brewing-calculator.firebasestorage.app",
  messagingSenderId: "1062737044340",
  appId: "1:1062737044340:web:5b24e2450ac96449ee8221"
};

// Initialize Firebase App & Auth
const firebaseApp = typeof firebase !== 'undefined' ? firebase.initializeApp(firebaseConfig) : null;
const auth = firebaseApp ? firebase.auth() : null;

// Connect to local Auth emulator if running on localhost or 127.0.0.1
if (auth && (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost')) {
  auth.useEmulator('http://127.0.0.1:9099');
}

/**
 * Centralized authenticated API fetch wrapper.
 * Resolves local dev URL (:8000) vs production single-origin rewrites (/api/**)
 * and attaches Bearer ID token if authenticated.
 */
async function apiFetch(path, options = {}) {
  const isLocalEmulator =
    (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') &&
    window.location.port === '5000';

  const baseUrl = isLocalEmulator ? 'http://127.0.0.1:8000' : '';
  const url = `${baseUrl}${path}`;

  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');

  if (auth && auth.currentUser) {
    try {
      const idToken = await auth.currentUser.getIdToken();
      headers.set('Authorization', `Bearer ${idToken}`);
    } catch (err) {
      console.warn('Failed to retrieve Firebase ID token:', err);
    }
  }

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    console.warn(`Unauthorized request to: ${path}`);
  }

  return response;
}

/**
 * Universal Unit Registry & Conversion Engine
 */
const UNIT_REGISTRY = {
  mass: {
    base_unit: 'kg',
    units: {
      kg: { label: 'kg', factor: 1.0, precision: 3 },
      g:  { label: 'g',  factor: 0.001, precision: 1 },
      lb: { label: 'lb', factor: 0.45359237, precision: 2 },
      oz: { label: 'oz', factor: 0.028349523, precision: 2 }
    }
  },
  volume: {
    base_unit: 'L',
    units: {
      L:   { label: 'L',   factor: 1.0, precision: 2 },
      ml:  { label: 'mL',  factor: 0.001, precision: 0 },
      gal: { label: 'gal', factor: 3.785411784, precision: 2 },
      qt:  { label: 'qt',  factor: 0.946352946, precision: 2 }
    }
  },
  temperature: {
    base_unit: 'C',
    units: {
      C: { label: '°C', to_base: (v) => v, from_base: (v) => v, precision: 1 },
      F: { label: '°F', to_base: (v) => (v - 32) * (5/9), from_base: (v) => (v * (9/5)) + 32, precision: 1 }
    }
  },
  gravity: {
    base_unit: 'SG',
    units: {
      SG:    { label: 'SG',    to_base: (v) => v, from_base: (v) => v, precision: 3 },
      Plato: { label: '°P',    to_base: (p) => 1 + (p / (258.6 - (p/258.2) * 227.1)), from_base: (sg) => (-1 * 616.868) + (1111.14 * sg) - (630.272 * Math.pow(sg, 2)) + (135.997 * Math.pow(sg, 3)), precision: 1 }
    }
  },
  percentage: {
    base_unit: 'fraction',
    units: {
      fraction: { label: 'fraction', to_base: (v) => v, from_base: (v) => v, precision: 3 },
      '%':      { label: '%',        to_base: (v) => v / 100, from_base: (v) => v * 100, precision: 1 }
    }
  },
  compound: {
    base_unit: 'L/kg',
    units: {
      'L/kg':  { label: 'L/kg',  to_base: (v) => v, from_base: (v) => v, precision: 2 },
      'qt/lb': { label: 'qt/lb', to_base: (v) => v * 2.08635, from_base: (v) => v / 2.08635, precision: 2 }
    }
  },
  extract_potential: {
    base_unit: 'L·°/kg',
    units: {
      'L·°/kg':    { label: 'L·°/kg',    to_base: (v) => v, from_base: (v) => v, precision: 2 },
      'gal·°/lb': { label: 'gal·°/lb', to_base: (v) => v * 8.3454, from_base: (v) => v / 8.3454, precision: 2 }
    }
  },
  color: {
    base_unit: 'SRM',
    units: {
      SRM: { label: 'SRM', to_base: (v) => v, from_base: (v) => v, precision: 1 },
      ECB: { label: 'ECB', to_base: (v) => v / 1.97, from_base: (v) => v * 1.97, precision: 1 }
    }
  },
  grist_potential_unit: {
    base_unit: 'pts·gal/lb',
    units: {
      'pts·gal/lb': { label: 'pts·gal/lb', to_base: (v) => v, from_base: (v) => v, precision: 1 },
      'L·°/kg':     { label: 'L·°/kg',     to_base: (v) => v, from_base: (v) => v, precision: 1 }
    }
  }
};

document.addEventListener('alpine:init', () => {
  // Global Units Store with Option C toggle support & per-field overrides
  Alpine.store('units', {
    activePreset: BREW_CONSTANTS.UNIT_PRESET_METRIC, // 'metric' | 'imperial' | 'custom'
    domainDefaults: {
      volume: 'L',
      mass: 'kg',
      hopMass: 'g',
      temperature: 'C',
      gravity: 'SG',
      percentage: '%',
      compound: 'L/kg',
      extract_potential: 'L·°/kg',
      color: 'SRM',
      grist_potential_unit: 'L·°/kg'
    },
    preferences: {
      // domain-level fallbacks
      volume: { unit: 'L', is_customized: false },
      mass: { unit: 'kg', is_customized: false },
      hopMass: { unit: 'g', is_customized: false },
      temperature: { unit: 'C', is_customized: false },
      gravity: { unit: 'SG', is_customized: false },
      percentage: { unit: '%', is_customized: false },
      compound: { unit: 'L/kg', is_customized: false },
      extract_potential: { unit: 'L·°/kg', is_customized: false },
      color: { unit: 'SRM', is_customized: false },
      grist_potential_unit: { unit: 'L·°/kg', is_customized: false }
    },
    fieldPreferences: {
      // fieldKey -> { unit, is_customized }
    },
    promptModalOpen: false,
    pendingPreset: null,

    // Bi-Directional Hydration Coordinator State
    isReady: false,
    isSaving: false,
    error: { message: null },

    sanitize(raw) {
      if (!raw || typeof raw !== 'object') return {};
      const sanitized = {};
      if (raw.activePreset && typeof raw.activePreset === 'string') {
        sanitized.activePreset = raw.activePreset;
      }
      if (raw.preferences && typeof raw.preferences === 'object') {
        sanitized.preferences = raw.preferences;
      }
      if (raw.fieldPreferences && typeof raw.fieldPreferences === 'object') {
        sanitized.fieldPreferences = raw.fieldPreferences;
      }
      return sanitized;
    },

    async hydrate(providerFn) {
      this.isReady = false;
      this.error.message = null;
      try {
        const raw = await providerFn();
        const sanitized = this.sanitize(raw);
        if (sanitized.activePreset) this.activePreset = sanitized.activePreset;
        if (sanitized.preferences) this.preferences = { ...this.preferences, ...sanitized.preferences };
        if (sanitized.fieldPreferences) this.fieldPreferences = { ...sanitized.fieldPreferences };
      } catch (err) {
        this.error.message = err.message || 'Failed to load unit preferences';
        console.warn('Hydration coordinator error:', err);
      } finally {
        this.isReady = true;
      }
    },

    async commit(payload, writerFn) {
      this.isSaving = true;
      this.error.message = null;
      try {
        const sanitized = this.sanitize(payload);
        await writerFn(sanitized);
      } catch (err) {
        this.error.message = err.message || 'Failed to save unit preferences';
        console.warn('Persistence coordinator error:', err);
      } finally {
        this.isSaving = false;
      }
    },

    clearError() {
      this.error.message = null;
    },

    isPureMetric() {
      const hasCustom = Object.values(this.preferences).some(p => p.is_customized) || Object.keys(this.fieldPreferences).length > 0;
      const isMetricBase = this.activePreset === BREW_CONSTANTS.UNIT_PRESET_METRIC || (this.activePreset === BREW_CONSTANTS.UNIT_PRESET_CUSTOM && this.preferences.volume.unit === 'L');
      return isMetricBase && !hasCustom;
    },
    isMixedMetric() {
      const hasCustom = Object.values(this.preferences).some(p => p.is_customized) || Object.keys(this.fieldPreferences).length > 0;
      const isMetricBase = this.activePreset === BREW_CONSTANTS.UNIT_PRESET_METRIC || (this.activePreset === BREW_CONSTANTS.UNIT_PRESET_CUSTOM && this.preferences.volume.unit === 'L');
      return isMetricBase && hasCustom;
    },
    isPureImperial() {
      const hasCustom = Object.values(this.preferences).some(p => p.is_customized) || Object.keys(this.fieldPreferences).length > 0;
      const isImperialBase = this.activePreset === BREW_CONSTANTS.UNIT_PRESET_IMPERIAL || (this.activePreset === BREW_CONSTANTS.UNIT_PRESET_CUSTOM && this.preferences.volume.unit === 'gal');
      return isImperialBase && !hasCustom;
    },
    isMixedImperial() {
      const hasCustom = Object.values(this.preferences).some(p => p.is_customized) || Object.keys(this.fieldPreferences).length > 0;
      const isImperialBase = this.activePreset === BREW_CONSTANTS.UNIT_PRESET_IMPERIAL || (this.activePreset === BREW_CONSTANTS.UNIT_PRESET_CUSTOM && this.preferences.volume.unit === 'gal');
      return isImperialBase && hasCustom;
    },

    init() {
      this.hydrate(async () => {
        const saved = localStorage.getItem(BREW_CONSTANTS.STORAGE_KEY_UNIT_PREFERENCES);
        return saved ? JSON.parse(saved) : null;
      });
    },

    saveToStorage() {
      this.commit({
        activePreset: this.activePreset,
        preferences: this.preferences,
        fieldPreferences: this.fieldPreferences
      }, async (payload) => {
        localStorage.setItem(BREW_CONSTANTS.STORAGE_KEY_UNIT_PREFERENCES, JSON.stringify(payload));
      });
    },

    setPreset(presetName) {
      const hasCustomOverrides = Object.values(this.preferences).some(p => p.is_customized) ||
        Object.values(this.fieldPreferences).some(p => p.is_customized);
      if (hasCustomOverrides && presetName !== this.activePreset) {
        this.pendingPreset = presetName;
        this.promptModalOpen = true;
        return;
      }
      this.applyPreset(presetName, true);
    },

    applyPreset(presetName, overwriteAll = true) {
      this.activePreset = presetName;
      this.promptModalOpen = false;

      const newUnits = presetName === BREW_CONSTANTS.UNIT_PRESET_IMPERIAL
        ? { volume: 'gal', mass: 'lb', hopMass: 'oz', temperature: 'F', gravity: 'SG', percentage: '%', color: 'SRM', grist_potential_unit: 'pts·gal/lb' }
        : { volume: 'L', mass: 'kg', hopMass: 'g', temperature: 'C', gravity: 'SG', percentage: '%', color: 'ECB', grist_potential_unit: 'L·°/kg' };

      const updatedPrefs = { ...this.preferences };
      for (const [domain, unit] of Object.entries(newUnits)) {
        if (overwriteAll || !updatedPrefs[domain]?.is_customized) {
          updatedPrefs[domain] = { unit, is_customized: false };
        }
      }
      this.preferences = updatedPrefs;

      if (overwriteAll) {
        this.fieldPreferences = {};
      } else {
        const updatedFields = { ...this.fieldPreferences };
        for (const [fieldKey, pref] of Object.entries(updatedFields)) {
          if (!pref.is_customized) {
            delete updatedFields[fieldKey];
          }
        }
        this.fieldPreferences = updatedFields;
      }
      this.saveToStorage();
    },

    getFieldUnit(domain, fieldKey) {
      if (fieldKey && this.fieldPreferences[fieldKey] && this.fieldPreferences[fieldKey].is_customized) {
        return this.fieldPreferences[fieldKey].unit;
      }
      return this.preferences[domain]?.unit || this.domainDefaults[domain] || 'L';
    },

    isFieldCustomized(fieldKey) {
      return !!this.fieldPreferences[fieldKey]?.is_customized;
    },

    toggleField(domain, fieldKey) {
      const current = this.getFieldUnit(domain, fieldKey);
      let next = current;
      if (domain === 'volume') {
        next = current === 'L' ? 'gal' : 'L';
      } else if (domain === 'mass' || domain === 'hopMass') {
        next = current === 'kg' ? 'lb' : 'kg';
      } else if (domain === 'temperature') {
        next = current === 'C' ? 'F' : 'C';
      } else if (domain === 'gravity') {
        next = current === 'SG' ? 'Plato' : 'SG';
      } else if (domain === 'percentage') {
        next = current === 'fraction' ? '%' : 'fraction';
      }

      const defaultUnit = this.activePreset === 'imperial'
        ? (domain === 'mass' || domain === 'hopMass' ? 'lb' : (domain === 'volume' ? 'gal' : (domain === 'temperature' ? 'F' : (domain === 'gravity' ? 'SG' : (domain === 'percentage' ? '%' : 'fraction')))))
        : (domain === 'mass' || domain === 'hopMass' ? 'kg' : (domain === 'volume' ? 'L' : (domain === 'temperature' ? 'C' : (domain === 'gravity' ? 'SG' : (domain === 'percentage' ? '%' : 'fraction')))));

      const isCustom = next !== defaultUnit;
      this.activePreset = 'custom';

      if (fieldKey) {
        if (isCustom) {
          this.fieldPreferences[fieldKey] = { unit: next, is_customized: true };
        } else {
          delete this.fieldPreferences[fieldKey];
        }
      } else {
        this.preferences[domain] = { unit: next, is_customized: isCustom };
      }
      this.saveToStorage();
    },

    toggleCompound(fieldKey) {
      const current = this.getFieldUnit('compound', fieldKey);
      const next = current === 'L/kg' ? 'qt/lb' : 'L/kg';
      const isCustom = next !== 'L/kg';
      this.activePreset = 'custom';
      if (isCustom) {
        this.fieldPreferences[fieldKey] = { unit: next, is_customized: true };
      } else {
        delete this.fieldPreferences[fieldKey];
      }
      this.saveToStorage();
    },

    toggleExtractPotential(fieldKey) {
      const current = this.getFieldUnit('extract_potential', fieldKey);
      const next = current === 'L·°/kg' ? 'gal·°/lb' : 'L·°/kg';
      const isCustom = next !== 'L·°/kg';
      this.activePreset = 'custom';
      if (isCustom) {
        this.fieldPreferences[fieldKey] = { unit: next, is_customized: true };
      } else {
        delete this.fieldPreferences[fieldKey];
      }
      this.saveToStorage();
    },

    togglePercentage(fieldKey) {
      const current = this.getFieldUnit('percentage', fieldKey);
      const next = current === 'fraction' ? '%' : 'fraction';
      const isCustom = next !== '%';
      this.activePreset = 'custom';
      if (isCustom) {
        this.fieldPreferences[fieldKey] = { unit: next, is_customized: true };
      } else {
        delete this.fieldPreferences[fieldKey];
      }
      this.saveToStorage();
    },

    toDisplay(domain, baseValue, fieldKey) {
      if (baseValue == null || isNaN(baseValue)) return 0;
      const domainDef = UNIT_REGISTRY[domain];
      if (!domainDef) return baseValue;
      const pref = this.getFieldUnit(domain, fieldKey);
      const unitDef = domainDef.units[pref];
      if (!unitDef) return baseValue;

      let converted = 0;
      if (unitDef.to_base) {
        converted = unitDef.from_base ? unitDef.from_base(baseValue) : baseValue;
      } else {
        converted = baseValue / unitDef.factor;
      }
      return Number(converted.toFixed(unitDef.precision || 2));
    },

    toBase(domain, displayValue, fieldKey) {
      if (displayValue == null || isNaN(displayValue)) return 0;
      const domainDef = UNIT_REGISTRY[domain];
      if (!domainDef) return displayValue;
      const pref = this.getFieldUnit(domain, fieldKey);
      const unitDef = domainDef.units[pref];
      if (!unitDef) return displayValue;

      let baseVal = 0;
      if (unitDef.to_base) {
        baseVal = unitDef.to_base(displayValue);
      } else {
        baseVal = displayValue * unitDef.factor;
      }
      return baseVal;
    }
  });

  // Two-Tier Grist Grain Bill & Hamilton Proportional Allocation Engine
  Alpine.store('maltGrid', {
    majorMalts: [
      {
        row_id: 'row_default_1',
        catalog_id: 'malt_2row',
        is_custom: false,
        name: 'Briess 2-Row Pale',
        category: 'BASE',
        parts: 10.0,
        pct: 100.0,
        potential_fraction: 0.80,
        color_srm: 1.8,
        moisture_pct: 0.04,
        di_ph: 5.75,
        buffer_index: 45.0,
        notes: 'Standard American 2-row base malt.'
      }
    ],
    traceMalts: [],

    modalOpen: false,
    draftMajorMalts: [],
    draftTraceMalts: [],

    drawerMode: null,
    activeRowId: null,
    catalogSearchQuery: '',
    selectedCategories: ['BASE', 'CRYSTAL', 'ROASTED', 'ACID'],

    get totalPct() {
      return this.modalOpen
        ? this.draftMajorMalts.reduce((sum, r) => sum + (r.pct || 0), 0)
        : this.majorMalts.reduce((sum, r) => sum + (r.pct || 0), 0);
    },

    get weightedSrm() {
      const rows = this.modalOpen ? this.draftMajorMalts : this.majorMalts;
      const totalPct = rows.reduce((sum, r) => sum + (r.pct || 0), 0);
      if (totalPct <= 0) return 0.0;
      const weightedSum = rows.reduce((sum, r) => sum + ((r.pct || 0) * (parseFloat(r.color_srm) || 0)), 0);
      return weightedSum / totalPct;
    },

    get isMetricUnits() {
      const unitsStore = Alpine.store('units');
      if (!unitsStore) return false;
      return unitsStore.activePreset === 'metric' || unitsStore.preferences?.volume?.unit === 'L';
    },

    get weightedColorDisplay() {
      const srm = this.weightedSrm;
      const unitsStore = Alpine.store('units');
      return unitsStore ? unitsStore.toDisplay('color', srm) : Number(srm.toFixed(1));
    },

    get weightedColorUnit() {
      const unitsStore = Alpine.store('units');
      return unitsStore ? unitsStore.getFieldUnit('color') : 'SRM';
    },

    get weightedPotential() {
      const rows = this.modalOpen ? this.draftMajorMalts : this.majorMalts;
      const totalPct = rows.reduce((sum, r) => sum + (r.pct || 0), 0);
      if (totalPct <= 0) return 1.000;
      const weightedFrac = rows.reduce((sum, r) => sum + ((r.pct || 0) * (parseFloat(r.potential_fraction) || 0.75)), 0) / totalPct;
      const sg = 1.0 + (weightedFrac * 0.046);
      return Number(sg.toFixed(3));
    },

    get weightedPotentialDisplay() {
      const rows = this.modalOpen ? this.draftMajorMalts : this.majorMalts;
      const totalPct = rows.reduce((sum, r) => sum + (r.pct || 0), 0);
      if (totalPct <= 0) return 0.0;

      const weightedFrac = rows.reduce((sum, r) => sum + ((r.pct || 0) * (parseFloat(r.potential_fraction) || 0.75)), 0) / totalPct;
      
      const unitsStore = Alpine.store('units');
      const isImperial = unitsStore ? (unitsStore.activePreset === 'imperial' || unitsStore.preferences?.volume?.unit === 'gal') : false;

      const constants = typeof BREW_CONSTANTS !== 'undefined' ? BREW_CONSTANTS : (typeof window !== 'undefined' ? window.BREW_CONSTANTS : {});
      const sucrosePpg = constants.SUCROSE_POTENTIAL_PPG || 46.21;
      const metricScaling = constants.METRIC_POTENTIAL_SCALING_FACTOR || 386.4;

      const baseVal = isImperial ? (weightedFrac * sucrosePpg) : (weightedFrac * metricScaling);
      const domainKey = isImperial ? 'extract_potential' : 'grist_potential_unit';
      return unitsStore ? unitsStore.toDisplay(domainKey, baseVal) : Number(baseVal.toFixed(1));
    },

    get weightedPotentialUnit() {
      const unitsStore = Alpine.store('units');
      const isImperial = unitsStore ? (unitsStore.activePreset === 'imperial' || unitsStore.preferences?.volume?.unit === 'gal') : false;
      const domainKey = isImperial ? 'extract_potential' : 'grist_potential_unit';
      return unitsStore ? unitsStore.getFieldUnit(domainKey) : (isImperial ? 'pts·gal/lb' : 'L·°/kg');
    },

    maltColorDisplay(row) {
      const srm = parseFloat(row.color_srm) || 0;
      const unitsStore = Alpine.store('units');
      return unitsStore ? unitsStore.toDisplay('color', srm) : Number(srm.toFixed(1));
    },

    maltPotentialDisplay(row) {
      const frac = parseFloat(row.potential_fraction) || 0.75;
      const unitsStore = Alpine.store('units');
      const isImperial = unitsStore ? (unitsStore.activePreset === 'imperial' || unitsStore.preferences?.volume?.unit === 'gal') : false;
      const constants = typeof BREW_CONSTANTS !== 'undefined' ? BREW_CONSTANTS : (typeof window !== 'undefined' ? window.BREW_CONSTANTS : {});
      const sucrosePpg = constants.SUCROSE_POTENTIAL_PPG || 46.21;
      const metricScaling = constants.METRIC_POTENTIAL_SCALING_FACTOR || 386.4;

      const baseVal = isImperial ? (frac * sucrosePpg) : (frac * metricScaling);
      const domainKey = isImperial ? 'extract_potential' : 'grist_potential_unit';
      return unitsStore ? unitsStore.toDisplay(domainKey, baseVal) : Number(baseVal.toFixed(1));
    },

    get validationStatus() {
      const total = Number(this.totalPct.toFixed(1));
      if (total === 100.0) return { type: 'balanced', label: '100.0% Balanced', class: 'badge-success' };
      if (total === 0.0) return { type: 'unconfigured', label: 'Unconfigured', class: 'badge-muted' };
      if (total < 100.0) {
        const remaining = (100.0 - total).toFixed(1);
        return { type: 'deficit', label: `${total.toFixed(1)}% (Remaining: ${remaining}%)`, class: 'badge-amber' };
      }
      const excess = (total - 100.0).toFixed(1);
      return { type: 'surplus', label: `${total.toFixed(1)}% (Excess: +${excess}%)`, class: 'badge-danger' };
    },

    openModal() {
      this.draftMajorMalts = JSON.parse(JSON.stringify(this.majorMalts));
      this.draftTraceMalts = JSON.parse(JSON.stringify(this.traceMalts));
      this.drawerMode = null;
      this.activeRowId = null;
      this.modalOpen = true;
      this.normalizeDraft();
    },

    saveModal() {
      this.majorMalts = JSON.parse(JSON.stringify(this.draftMajorMalts));
      this.traceMalts = JSON.parse(JSON.stringify(this.draftTraceMalts));
      this.modalOpen = false;
      this.drawerMode = null;
      this.activeRowId = null;
    },

    cancelModal() {
      this.modalOpen = false;
      this.drawerMode = null;
      this.activeRowId = null;
    },

    normalizeDraft() {
      const rows = this.draftMajorMalts;
      if (!rows || rows.length === 0) return;

      const totalParts = rows.reduce((sum, r) => sum + Math.max(0, parseFloat(r.parts) || 0), 0);
      if (totalParts === 0) {
        rows.forEach(r => { r.pct = 0.0; });
        return;
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

      rows.forEach((r, idx) => {
        r.pct = finalScaled[idx] / 10.0;
      });
    },

    updateParts(rowId, val) {
      const row = this.draftMajorMalts.find(r => r.row_id === rowId);
      if (row) {
        const parsed = parseFloat(val);
        row.parts = isNaN(parsed) || parsed < 0 ? 0 : parsed;
        this.normalizeDraft();
      }
    },

    isTrace(pct) {
      return pct < 2.0;
    },

    addMajorMalt(catalogItem) {
      const newRow = {
        row_id: 'row_' + Math.random().toString(36).substring(2, 11),
        catalog_id: catalogItem.id || null,
        is_custom: false,
        name: catalogItem.name,
        category: catalogItem.category || 'BASE',
        parts: 10.0,
        pct: 0.0,
        potential_fraction: catalogItem.potential_fraction ?? (catalogItem.potential_sg ? (catalogItem.potential_sg - 1.0) / 0.046 : 0.75),
        color_srm: catalogItem.color_srm || 2.0,
        moisture_pct: catalogItem.moisture_pct || 0.04,
        di_ph: catalogItem.di_ph || 5.75,
        buffer_index: catalogItem.buffer_index || 45.0,
        notes: catalogItem.notes || ''
      };
      this.draftMajorMalts.push(newRow);
      this.normalizeDraft();
    },

    removeMajorMalt(rowId) {
      this.draftMajorMalts = this.draftMajorMalts.filter(r => r.row_id !== rowId);
      if (this.activeRowId === rowId) {
        this.activeRowId = null;
        if (this.drawerMode === 'inspect') this.drawerMode = null;
      }
      this.normalizeDraft();
    },

    cloneAndEdit(rowId) {
      const row = this.draftMajorMalts.find(r => r.row_id === rowId);
      if (!row) return;
      const clone = JSON.parse(JSON.stringify(row));
      clone.row_id = 'row_' + Math.random().toString(36).substring(2, 11);
      clone.is_custom = true;
      clone.name = `${clone.name} (Custom)`;
      this.draftMajorMalts.push(clone);
      this.normalizeDraft();
      this.inspectRow(clone.row_id);
    },

    inspectRow(rowId) {
      this.activeRowId = rowId;
      this.drawerMode = 'inspect';
    },

    openSearchDrawer() {
      this.drawerMode = 'search';
      this.activeRowId = null;
      this.catalogSearchQuery = '';
      this.selectedCategories = ['BASE', 'CRYSTAL', 'ROASTED', 'ACID'];
    },

    toggleCategory(cat) {
      if (this.selectedCategories.includes(cat)) {
        this.selectedCategories = this.selectedCategories.filter(c => c !== cat);
      } else {
        this.selectedCategories.push(cat);
      }
    },

    isCategorySelected(cat) {
      return this.selectedCategories.includes(cat);
    },

    clearSearchQuery() {
      this.catalogSearchQuery = '';
    },

    get filteredCatalog() {
      const allMalts = Alpine.store('catalog') ? Alpine.store('catalog').malts : [];
      const activeCatalogIds = new Set(this.draftMajorMalts.map(r => r.catalog_id).filter(Boolean));
      const q = (this.catalogSearchQuery || '').trim().toLowerCase();

      return allMalts.filter(item => {
        if (activeCatalogIds.has(item.id)) return false;
        if (!this.selectedCategories.includes(item.category)) return false;
        if (q) {
          const matchName = item.name && item.name.toLowerCase().includes(q);
          const matchNotes = item.notes && item.notes.toLowerCase().includes(q);
          if (!matchName && !matchNotes) return false;
        }
        return true;
      });
    },

    get catalogResultCount() {
      return this.filteredCatalog.length;
    },

    closeDrawer() {
      this.drawerMode = null;
      this.activeRowId = null;
    }
  });

  // Global Authentication Store
  Alpine.store('auth', {
    user: null,
    loading: true,
    error: null,

    init() {
      if (!auth) {
        this.loading = false;
        return;
      }

      auth.onAuthStateChanged((firebaseUser) => {
        if (firebaseUser) {
          this.user = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || 'Google User',
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL || null,
          };
          // Fetch ingredient catalog and equipment profiles upon successful authentication
          Alpine.store('catalog').fetchCatalog();
          Alpine.store('equipment').fetchProfiles();
        } else {
          this.user = null;
          Alpine.store('catalog').malts = [];
          Alpine.store('catalog').sugars = [];
          Alpine.store('catalog').loaded = false;
          Alpine.store('equipment').profiles = [];
          Alpine.store('equipment').loaded = false;
        }
        this.loading = false;
      });
    },

    async signInWithGoogle() {
      if (!auth) return;
      this.error = null;
      try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await auth.signInWithPopup(provider);
      } catch (err) {
        this.error = err.message;
        console.error('Google Sign-In failed:', err);
      }
    },

    async signOut() {
      if (!auth) return;
      this.error = null;
      try {
        await auth.signOut();
        this.user = null;
      } catch (err) {
        this.error = err.message;
        console.error('Sign-Out failed:', err);
      }
    },

    requireAuth(redirectUrl = '/index.html') {
      if (!this.loading && !this.user) {
        window.location.replace(redirectUrl);
      }
    }
  });

  // Global UI Store for notifications
  Alpine.store('ui', {
    toasts: [],
    add(message, type = 'info', timeout = 4000) {
      const id = Date.now();
      this.toasts.push({ id, message, type });
      setTimeout(() => this.remove(id), timeout);
    },
    remove(id) {
      this.toasts = this.toasts.filter(t => t.id !== id);
    }
  });

  // Global Catalog Store for Fermentables (Malts & Sugars)
  Alpine.store('catalog', {
    malts: [],
    sugars: [],
    loading: false,
    error: null,
    loaded: false,

    async fetchCatalog() {
      if (this.loaded || this.loading) return;
      this.loading = true;
      this.error = null;
      try {
        const response = await apiFetch('/api/fermentables');
        if (!response.ok) {
          throw new Error(`Failed to load fermentables catalog: ${response.status}`);
        }
        const data = await response.json();
        this.malts = data.malts || [];
        this.sugars = data.sugars || [];
        this.loaded = true;
      } catch (err) {
        this.error = err.message;
        console.error('Error fetching fermentables catalog:', err);
      } finally {
        this.loading = false;
      }
    },

    getMaltById(id) {
      return this.malts.find(m => m.id === id) || null;
    },

    getSugarById(id) {
      return this.sugars.find(s => s.id === id) || null;
    },

    getMaltsByCategory(category) {
      return this.malts.filter(m => m.category === category);
    }
  });

  // Global Equipment Profiles Store
  Alpine.store('equipment', {
    profiles: [],
    loading: false,
    error: null,
    loaded: false,

    async fetchProfiles() {
      if (this.loaded || this.loading) return;
      this.loading = true;
      this.error = null;
      try {
        const response = await apiFetch('/api/equipment-profiles');
        if (!response.ok) {
          throw new Error(`Failed to load equipment profiles: ${response.status}`);
        }
        const data = await response.json();
        this.profiles = data.profiles || [];
        this.loaded = true;
      } catch (err) {
        this.error = err.message;
        console.error('Error fetching equipment profiles:', err);
      } finally {
        this.loading = false;
      }
    },

    getProfileById(id) {
      return this.profiles.find(p => p.id === id) || null;
    },

    async saveProfile(profileData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiFetch('/api/equipment-profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profileData)
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.detail || `Save failed: HTTP ${response.status}`);
        }
        const saved = await response.json();
        const existingIdx = this.profiles.findIndex(p => p.id === saved.id);
        if (existingIdx >= 0) {
          this.profiles[existingIdx] = saved;
        } else {
          this.profiles.push(saved);
        }
        Alpine.store('ui').add(`Saved profile "${saved.name}"`, 'success');
        return saved;
      } catch (err) {
        this.error = err.message;
        Alpine.store('ui').add(err.message, 'error');
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async deleteProfile(profileId) {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiFetch(`/api/equipment-profiles/${encodeURIComponent(profileId)}`, {
          method: 'DELETE'
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.detail || `Delete failed: HTTP ${response.status}`);
        }
        this.profiles = this.profiles.filter(p => p.id !== profileId);
        Alpine.store('ui').add('Equipment profile deleted', 'info');
        return true;
      } catch (err) {
        this.error = err.message;
        Alpine.store('ui').add(err.message, 'error');
        throw err;
      } finally {
        this.loading = false;
      }
    }
  });

  // Progressive 12-Step Wizard State Machine
  Alpine.data('wizard', () => ({
    // Presentation FSM State
    activeStep: 1,
    completedSteps: [],
    highWaterMark: 1,
    dirtySteps: [],
    expansionMode: 'exclusive',

    // Profile Management Drawer State
    showProfileDrawer: false,
    drawerMode: 'list', // 'list' | 'create' | 'edit'
    drawerForm: {
      id: '',
      name: '',
      description: '',
      max_kettle_volume_l: BREW_CONSTANTS.DEFAULT_MAX_KETTLE_VOLUME_L,
      max_mash_tun_volume_l: BREW_CONSTANTS.DEFAULT_MAX_MASH_TUN_VOLUME_L,
      max_hlt_volume_l: BREW_CONSTANTS.DEFAULT_MAX_HLT_VOLUME_L,
      mash_dead_space_l: BREW_CONSTANTS.DEFAULT_MASH_DEAD_SPACE_L,
      trub_loss_l: BREW_CONSTANTS.DEFAULT_TRUB_LOSS_L,
      boil_off_rate_l_per_hr: BREW_CONSTANTS.DEFAULT_BOIL_OFF_RATE_L_PER_HR,
      grain_absorption_factor_l_per_kg: BREW_CONSTANTS.DEFAULT_GRAIN_ABSORPTION_L_PER_KG,
      conversion_efficiency: BREW_CONSTANTS.DEFAULT_CONVERSION_EFFICIENCY,
      shrinkage_pct: BREW_CONSTANTS.DEFAULT_SHRINKAGE_PCT,
      hlt_min_volume_l: BREW_CONSTANTS.DEFAULT_HLT_MIN_VOLUME_L,
    },
    drawerError: null,

    // Working Recipe Manifest
    manifest: {
      name: BREW_CONSTANTS.DEFAULT_BATCH_NAME,
      equipment_profile_id: BREW_CONSTANTS.DEFAULT_EQUIPMENT_PROFILE_ID,
      equipment: {
        max_kettle_volume_l: 38.0,
        max_mash_tun_volume_l: 38.0,
        max_hlt_volume_l: 38.0,
        mash_dead_space_l: 1.5,
        trub_loss_l: 2.0,
        boil_off_rate_l_per_hr: 3.5,
        grain_absorption_factor_l_per_kg: 0.96,
        conversion_efficiency: 0.90,
        shrinkage_pct: 0.04,
        hlt_min_volume_l: 12.0,
      },
      target_volume_l: BREW_CONSTANTS.DEFAULT_TARGET_VOLUME_L,
      target_og: BREW_CONSTANTS.DEFAULT_TARGET_OG,
      boil_time_min: BREW_CONSTANTS.DEFAULT_BOIL_TIME_MIN,
      boil_solver_mode: 'option_b', // 'option_b' (solve post-boil/OG) or 'option_a' (solve boil-off rate)
      preboil_volume_l: 26.0,
      preboil_gravity: 1.045,
      postboil_volume_l: 22.5,
      postboil_gravity: 1.052,
      grain_bill: [],
      late_additions: [],
      mash_profile: [],
      water_profile_id: null,
      hop_schedule: [],
      yeast_id: null,
      fermentation_schedule: [],
      dry_hops: []
    },

    init() {
      // Auto-load matching preset once equipment profiles are available
      this.$watch('$store.equipment.profiles', (profiles) => {
        if (profiles && profiles.length > 0 && !this.manifest.equipment_profile_id) {
          this.selectProfile(profiles[0].id);
          this.runBoilSolver();
        }
      });
      this.runBoilSolver();
    },

    setBoilSolverMode(mode) {
      this.manifest.boil_solver_mode = mode;
      this.runBoilSolver();
    },

    // Unit-aware field binding helpers (automatically convert between metric base storage and selected display unit)
    volDisplay(baseVal, fieldKey) {
      return Alpine.store('units') ? Alpine.store('units').toDisplay('volume', baseVal, fieldKey) : baseVal;
    },
    setVolDisplay(obj, prop, displayVal, fieldKey) {
      const baseVal = Alpine.store('units') ? Alpine.store('units').toBase('volume', parseFloat(displayVal), fieldKey) : parseFloat(displayVal);
      obj[prop] = isNaN(baseVal) ? 0 : baseVal;
      this.runBoilSolver();
    },
    massDisplay(baseVal, fieldKey) {
      return Alpine.store('units') ? Alpine.store('units').toDisplay('mass', baseVal, fieldKey) : baseVal;
    },
    setMassDisplay(obj, prop, displayVal, fieldKey) {
      const baseVal = Alpine.store('units') ? Alpine.store('units').toBase('mass', parseFloat(displayVal), fieldKey) : parseFloat(displayVal);
      obj[prop] = isNaN(baseVal) ? 0 : baseVal;
    },
    compoundDisplay(baseVal, fieldKey) {
      return Alpine.store('units') ? Alpine.store('units').toDisplay('compound', baseVal, fieldKey) : baseVal;
    },
    setCompoundDisplay(obj, prop, displayVal, fieldKey) {
      const baseVal = Alpine.store('units') ? Alpine.store('units').toBase('compound', parseFloat(displayVal), fieldKey) : parseFloat(displayVal);
      obj[prop] = isNaN(baseVal) ? 0 : baseVal;
    },
    percentageDisplay(baseVal, fieldKey) {
      return Alpine.store('units') ? Alpine.store('units').toDisplay('percentage', baseVal, fieldKey) : baseVal;
    },
    setPercentageDisplay(obj, prop, displayVal, fieldKey) {
      const baseVal = Alpine.store('units') ? Alpine.store('units').toBase('percentage', parseFloat(displayVal), fieldKey) : parseFloat(displayVal);
      obj[prop] = isNaN(baseVal) ? 0 : baseVal;
    },
    gravityDisplay(baseVal, fieldKey) {
      return Alpine.store('units') ? Alpine.store('units').toDisplay('gravity', baseVal, fieldKey) : baseVal;
    },
    setGravityDisplay(obj, prop, displayVal, fieldKey) {
      const baseVal = Alpine.store('units') ? Alpine.store('units').toBase('gravity', parseFloat(displayVal), fieldKey) : parseFloat(displayVal);
      obj[prop] = isNaN(baseVal) ? 1.0 : baseVal;
      this.runBoilSolver();
    },

    onBatchMetaChange() {
      this.runBoilSolver();
    },

    runBoilSolver() {
      const m = this.manifest;
      const eq = m.equipment;
      const boilTimeHrs = (parseFloat(m.boil_time_min) || 60) / 60.0;
      const trubLoss = parseFloat(eq.trub_loss_l) || 0;
      const shrinkage = parseFloat(eq.shrinkage_pct) || 0.04;

      if (m.boil_solver_mode === 'option_a') {
        // Option A: Pre-boil vol/gravity & Post-boil vol fixed -> solve Boil-Off Rate & Post-Boil OG
        const vPre = parseFloat(m.preboil_volume_l) || 26.0;
        const sgPre = parseFloat(m.preboil_gravity) || 1.045;
        const vPost = parseFloat(m.postboil_volume_l) || 22.5;

        if (boilTimeHrs > 0 && vPre > vPost) {
          const totalBoilOff = vPre - vPost;
          eq.boil_off_rate_l_per_hr = Number((totalBoilOff / boilTimeHrs).toFixed(2));
        }

        const extractPointsTotal = vPre * (sgPre - 1.0);
        const sgPost = vPost > 0 ? 1.0 + (extractPointsTotal / vPost) : 1.050;
        m.postboil_gravity = Number(sgPost.toFixed(3));

        const vTarget = Math.max(0, (vPost - trubLoss) * (1.0 - shrinkage));
        m.target_volume_l = Number(vTarget.toFixed(1));
        const targetOg = vTarget > 0 ? 1.0 + (extractPointsTotal / vTarget) : sgPost;
        m.target_og = Number(targetOg.toFixed(3));

      } else {
        // Option B (Default): Pre-boil vol/gravity, boil time & boil-off rate fixed -> solve Post-Boil Vol, Post-Boil Gravity, Packaged Volume & Target OG
        const vPre = parseFloat(m.preboil_volume_l) || 26.0;
        const sgPre = parseFloat(m.preboil_gravity) || 1.045;
        const rate = parseFloat(eq.boil_off_rate_l_per_hr) || 3.5;

        const totalBoilOff = rate * boilTimeHrs;
        const vPost = Math.max(0, vPre - totalBoilOff);
        m.postboil_volume_l = Number(vPost.toFixed(1));

        const extractPointsTotal = vPre * (sgPre - 1.0);
        const sgPost = vPost > 0 ? 1.0 + (extractPointsTotal / vPost) : 1.050;
        m.postboil_gravity = Number(sgPost.toFixed(3));

        const vTarget = Math.max(0, (vPost - trubLoss) * (1.0 - shrinkage));
        m.target_volume_l = Number(vTarget.toFixed(1));
        const targetOg = vTarget > 0 ? 1.0 + (extractPointsTotal / vTarget) : sgPost;
        m.target_og = Number(targetOg.toFixed(3));
      }
    },

    // Step 1 Synthesized Outputs
    get fixedSystemLoss() {
      const eq = this.manifest.equipment;
      const deadSpace = parseFloat(eq.mash_dead_space_l) || 0;
      const trub = parseFloat(eq.trub_loss_l) || 0;
      return (deadSpace + trub).toFixed(2);
    },

    get hourlyEvaporation() {
      return (parseFloat(this.manifest.equipment.boil_off_rate_l_per_hr) || 0).toFixed(2);
    },

    get kettleCapacity() {
      return (parseFloat(this.manifest.equipment.max_kettle_volume_l) || 0).toFixed(1);
    },

    get hltCoilFloor() {
      return (parseFloat(this.manifest.equipment.hlt_min_volume_l) || 0).toFixed(1);
    },

    // Step 2 Synthesized Outputs
    get targetVolumeDisplay() {
      return (parseFloat(this.manifest.target_volume_l) || 0).toFixed(1);
    },

    get targetOgPoints() {
      const og = parseFloat(this.manifest.target_og) || 1.000;
      const points = Math.max(0, (og - 1.0) * 1000);
      return points.toFixed(1);
    },

    get targetKettleExtract() {
      const vol = parseFloat(this.manifest.target_volume_l) || 0;
      const og = parseFloat(this.manifest.target_og) || 1.000;
      const points = Math.max(0, (og - 1.0) * 1000);
      return (vol * points).toFixed(1);
    },

    get isCustomModified() {
      const selectedId = this.manifest.equipment_profile_id;
      if (!selectedId) return true;
      const preset = Alpine.store('equipment').getProfileById(selectedId);
      if (!preset) return true;

      const eq = this.manifest.equipment;
      return (
        Number(eq.max_kettle_volume_l) !== Number(preset.max_kettle_volume_l) ||
        Number(eq.max_mash_tun_volume_l) !== Number(preset.max_mash_tun_volume_l) ||
        Number(eq.max_hlt_volume_l) !== Number(preset.max_hlt_volume_l) ||
        Number(eq.mash_dead_space_l) !== Number(preset.mash_dead_space_l) ||
        Number(eq.trub_loss_l) !== Number(preset.trub_loss_l) ||
        Number(eq.boil_off_rate_l_per_hr) !== Number(preset.boil_off_rate_l_per_hr) ||
        Number(eq.grain_absorption_factor_l_per_kg) !== Number(preset.grain_absorption_factor_l_per_kg) ||
        Number(eq.conversion_efficiency) !== Number(preset.conversion_efficiency) ||
        Number(eq.shrinkage_pct) !== Number(preset.shrinkage_pct) ||
        Number(eq.hlt_min_volume_l) !== Number(preset.hlt_min_volume_l)
      );
    },

    selectProfile(profileId) {
      this.manifest.equipment_profile_id = profileId;
      if (!profileId) return;

      const preset = Alpine.store('equipment').getProfileById(profileId);
      if (preset) {
        this.manifest.equipment = {
          max_kettle_volume_l: preset.max_kettle_volume_l,
          max_mash_tun_volume_l: preset.max_mash_tun_volume_l,
          max_hlt_volume_l: preset.max_hlt_volume_l,
          mash_dead_space_l: preset.mash_dead_space_l,
          trub_loss_l: preset.trub_loss_l,
          boil_off_rate_l_per_hr: preset.boil_off_rate_l_per_hr,
          grain_absorption_factor_l_per_kg: preset.grain_absorption_factor_l_per_kg,
          conversion_efficiency: preset.conversion_efficiency,
          shrinkage_pct: preset.shrinkage_pct,
          hlt_min_volume_l: preset.hlt_min_volume_l,
        };
        this.invalidateDownstream(1);
      }
    },

    onEquipmentChange() {
      this.invalidateDownstream(1);
    },

    onBatchMetaChange() {
      this.invalidateDownstream(2);
    },

    setActiveStep(stepNumber) {
      if (stepNumber <= this.highWaterMark || this.expansionMode === 'concurrent') {
        this.activeStep = stepNumber;
      }
    },

    markStepComplete(stepNumber) {
      // Validate Step 1
      if (stepNumber === 1) {
        const eq = this.manifest.equipment;
        if (!eq.max_kettle_volume_l || eq.max_kettle_volume_l <= 0) {
          Alpine.store('ui').add(BREW_CONSTANTS.MSG_KETTLE_VOLUME_REQUIRED, 'error');
          return;
        }
        if (!eq.boil_off_rate_l_per_hr || eq.boil_off_rate_l_per_hr <= 0) {
          Alpine.store('ui').add(BREW_CONSTANTS.MSG_BOIL_OFF_REQUIRED, 'error');
          return;
        }
      }

      // Validate Step 2
      if (stepNumber === 2) {
        if (!this.manifest.name || this.manifest.name.trim() === '') {
          Alpine.store('ui').add('Batch name is required.', 'error');
          return;
        }
        if (!this.manifest.target_volume_l || this.manifest.target_volume_l <= 0) {
          Alpine.store('ui').add('Target packaged volume must be greater than zero.', 'error');
          return;
        }
        if (!this.manifest.target_og || this.manifest.target_og < 1.010 || this.manifest.target_og > 1.200) {
          Alpine.store('ui').add('Target original gravity must be between 1.010 and 1.200.', 'error');
          return;
        }
      }

      if (!this.completedSteps.includes(stepNumber)) {
        this.completedSteps.push(stepNumber);
      }
      this.highWaterMark = Math.max(this.highWaterMark, stepNumber + 1);
      this.activeStep = stepNumber + 1;
      Alpine.store('ui').add(BREW_CONSTANTS.MSG_STEP_CONFIGURED_TEMPLATE(stepNumber), 'success');
    },

    invalidateDownstream(fromStepNumber) {
      // Mark downstream solved steps dirty
      this.dirtySteps = [6, 7, 8, 9, 11, 12].filter(step => step > fromStepNumber);
    },

    // Drawer CRUD helpers
    openProfileDrawer() {
      this.showProfileDrawer = true;
      this.drawerMode = 'list';
      this.drawerError = null;
    },

    closeProfileDrawer() {
      this.showProfileDrawer = false;
      this.drawerError = null;
    },

    startCreateProfile() {
      this.drawerMode = 'create';
      this.drawerError = null;
      // Copy current working values as a starting template
      const current = this.manifest.equipment;
      this.drawerForm = {
        id: `custom-${Date.now()}`,
        name: 'My Custom Profile',
        description: '',
        max_kettle_volume_l: current.max_kettle_volume_l || 35.0,
        max_mash_tun_volume_l: current.max_mash_tun_volume_l || 35.0,
        max_hlt_volume_l: current.max_hlt_volume_l || 35.0,
        mash_dead_space_l: current.mash_dead_space_l || 0.0,
        trub_loss_l: current.trub_loss_l || 1.5,
        boil_off_rate_l_per_hr: current.boil_off_rate_l_per_hr || 3.0,
        grain_absorption_factor_l_per_kg: current.grain_absorption_factor_l_per_kg || 0.96,
        conversion_efficiency: current.conversion_efficiency || 0.90,
        shrinkage_pct: current.shrinkage_pct || 0.04,
        hlt_min_volume_l: current.hlt_min_volume_l || 0.0,
      };
    },

    editProfile(profile) {
      this.drawerMode = 'edit';
      this.drawerError = null;
      this.drawerForm = {
        id: profile.id,
        name: profile.name,
        description: profile.description || '',
        max_kettle_volume_l: profile.max_kettle_volume_l,
        max_mash_tun_volume_l: profile.max_mash_tun_volume_l,
        max_hlt_volume_l: profile.max_hlt_volume_l,
        mash_dead_space_l: profile.mash_dead_space_l,
        trub_loss_l: profile.trub_loss_l,
        boil_off_rate_l_per_hr: profile.boil_off_rate_l_per_hr,
        grain_absorption_factor_l_per_kg: profile.grain_absorption_factor_l_per_kg,
        conversion_efficiency: profile.conversion_efficiency,
        shrinkage_pct: profile.shrinkage_pct,
        hlt_min_volume_l: profile.hlt_min_volume_l,
      };
    },

    async submitDrawerProfile() {
      this.drawerError = null;
      try {
        if (!this.drawerForm.name.trim()) {
          throw new Error('Profile name is required.');
        }
        if (Number(this.drawerForm.max_kettle_volume_l) <= 0) {
          throw new Error('Kettle volume must be greater than zero.');
        }
        if (Number(this.drawerForm.boil_off_rate_l_per_hr) <= 0) {
          throw new Error('Boil-off rate must be greater than zero.');
        }

        const payload = {
          ...this.drawerForm,
          max_kettle_volume_l: Number(this.drawerForm.max_kettle_volume_l),
          max_mash_tun_volume_l: Number(this.drawerForm.max_mash_tun_volume_l),
          max_hlt_volume_l: Number(this.drawerForm.max_hlt_volume_l),
          mash_dead_space_l: Number(this.drawerForm.mash_dead_space_l),
          trub_loss_l: Number(this.drawerForm.trub_loss_l),
          boil_off_rate_l_per_hr: Number(this.drawerForm.boil_off_rate_l_per_hr),
          grain_absorption_factor_l_per_kg: Number(this.drawerForm.grain_absorption_factor_l_per_kg),
          conversion_efficiency: Number(this.drawerForm.conversion_efficiency),
          shrinkage_pct: Number(this.drawerForm.shrinkage_pct),
          hlt_min_volume_l: Number(this.drawerForm.hlt_min_volume_l),
        };

        const saved = await Alpine.store('equipment').saveProfile(payload);
        this.selectProfile(saved.id);
        this.drawerMode = 'list';
      } catch (err) {
        this.drawerError = err.message;
      }
    },

    async removeCustomProfile(profileId) {
      if (!confirm('Are you sure you want to delete this custom profile?')) return;
      try {
        await Alpine.store('equipment').deleteProfile(profileId);
        if (this.manifest.equipment_profile_id === profileId) {
          const first = Alpine.store('equipment').profiles[0];
          if (first) this.selectProfile(first.id);
        }
      } catch (err) {
        // error handled in store
      }
    }
  }));

  // Main Page Interactive Component
  Alpine.data('app', () => ({
    messageInput: '',
    loading: false,
    response: null,
    error: null,

    async sendPing() {
      this.loading = true;
      this.error = null;
      this.response = null;

      try {
        const query = this.messageInput ? `?message=${encodeURIComponent(this.messageInput)}` : '';
        const res = await apiFetch(`/api/ping${query}`, { method: 'GET' });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.detail || `HTTP ${res.status}: ${res.statusText}`;
          Alpine.store('ui').add(errMsg, 'error');
          throw new Error(errMsg);
        }

        this.response = await res.json();
        Alpine.store('ui').add('Ping processed successfully!', 'success');
      } catch (err) {
        this.error = err instanceof Error ? err.message : String(err);
      } finally {
        this.loading = false;
      }
    },

    clearResponse() {
      this.response = null;
      this.error = null;
    },

    formatTimestamp(ts) {
      if (!ts) return '';
      const date = new Date(ts > 1e11 ? ts : ts * 1000);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    },
  }));
});
