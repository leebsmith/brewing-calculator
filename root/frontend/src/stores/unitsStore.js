// Store for managing units and their conversions.
// Extracted from frontend/script.js

export default Alpine.store('units', {
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
      this.error.message = err.message || BREW_CONSTANTS.MSG_UNIT_PREFERENCES_LOAD_FAILED;
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
    // Assuming BREW_CONSTANTS and Alpine are available in the global scope when this module is loaded.
    // If not, they would need to be imported.
    if (typeof Alpine === 'undefined' || typeof BREW_CONSTANTS === 'undefined') {
      console.error('Alpine.js or BREW_CONSTANTS not available in unitsStore init.');
      return;
    }
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
      ? { volume: 'gal', mass: 'lb', hopMass: 'oz', temperature: 'F', gravity: 'SG', percentage: '%', color: 'SRM', extract_potential: 'gal·°/lb' }
      : { volume: 'L', mass: 'kg', hopMass: 'g', temperature: 'C', gravity: 'SG', percentage: '%', color: 'ECB', extract_potential: 'L·°/kg' };

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
