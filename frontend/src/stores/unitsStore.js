/**
 * Global Units Store with Binary Invariant & Sparse Exceptions.
 */

import { BREW_CONSTANTS } from '../../constants.js';
import { UNIT_REGISTRY } from '../config/unitRegistry.js';

export default {
  globalMode: BREW_CONSTANTS.UNIT_MODES.METRIC,
  overrides: {},

  // Bi-Directional Hydration Coordinator State
  isReady: false,
  isSaving: false,
  error: { message: null },

  get overrideCount() {
    return Object.keys(this.overrides).filter(key => key in BREW_CONSTANTS.FIELD_REGISTRY).length;
  },

  get isPure() {
    return this.overrideCount === 0;
  },

  get isMixed() {
    return this.overrideCount > 0;
  },

  isPureMetric() {
    return this.globalMode === BREW_CONSTANTS.UNIT_MODES.METRIC && this.isPure;
  },

  isMixedMetric() {
    return this.globalMode === BREW_CONSTANTS.UNIT_MODES.METRIC && this.isMixed;
  },

  isPureImperial() {
    return this.globalMode === BREW_CONSTANTS.UNIT_MODES.IMPERIAL && this.isPure;
  },

  isMixedImperial() {
    return this.globalMode === BREW_CONSTANTS.UNIT_MODES.IMPERIAL && this.isMixed;
  },

  sanitize(raw) {
    if (!raw || typeof raw !== 'object') return { globalMode: BREW_CONSTANTS.UNIT_MODES.METRIC, overrides: {} };
    const sanitized = {
      globalMode: (raw.globalMode === BREW_CONSTANTS.UNIT_MODES.IMPERIAL) ? BREW_CONSTANTS.UNIT_MODES.IMPERIAL : BREW_CONSTANTS.UNIT_MODES.METRIC,
      overrides: {}
    };
    if (raw.overrides && typeof raw.overrides === 'object') {
      for (const [key, value] of Object.entries(raw.overrides)) {
        if (key in BREW_CONSTANTS.FIELD_REGISTRY && (value === 0 || value === 1)) {
          sanitized.overrides[key] = value;
        }
      }
    }
    return sanitized;
  },

  async hydrate(providerFn) {
    this.isReady = false;
    this.error.message = null;
    try {
      const raw = await providerFn();
      if (raw) {
        const sanitized = this.sanitize(raw);
        this.globalMode = sanitized.globalMode;
        this.overrides = sanitized.overrides;
      }
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

  init() {
    this.hydrate(async () => {
      const saved = localStorage.getItem(BREW_CONSTANTS.STORAGE_KEY_UNIT_PREFERENCES);
      return saved ? JSON.parse(saved) : null;
    });
  },

  saveToStorage() {
    this.commit({
      globalMode: this.globalMode,
      overrides: this.overrides
    }, async (payload) => {
      localStorage.setItem(BREW_CONSTANTS.STORAGE_KEY_UNIT_PREFERENCES, JSON.stringify(payload));
    });
  },

  getFieldBit(fieldKey) {
    const domain = BREW_CONSTANTS.FIELD_REGISTRY[fieldKey];
    if (!domain) return this.globalMode; // Unknown field defaults to global

    if (fieldKey in this.overrides) {
      return this.overrides[fieldKey];
    }
    // Percentages are invariant (always default to bit 0 '%')
    if (domain === BREW_CONSTANTS.UNIT_DOMAIN_PERCENTAGE) {
      return 0;
    }
    return this.globalMode;
  },

  getFieldUnit(fieldKey) {
    // If not provided or not in registry, look up by domain as a fallback
    // (This supports legacy domain-only lookups like getFieldUnit('color') used elsewhere)
    let domain = BREW_CONSTANTS.FIELD_REGISTRY[fieldKey];
    let isDomainLookup = false;
    
    if (!domain) {
      domain = fieldKey;
      isDomainLookup = true;
    }
    
    const tuple = BREW_CONSTANTS.DOMAIN_BINARY_PAIRS[domain];
    if (!tuple) return '';
    
    const bit = isDomainLookup ? 
      (domain === BREW_CONSTANTS.UNIT_DOMAIN_PERCENTAGE ? 0 : this.globalMode) : 
      this.getFieldBit(fieldKey);
      
    return tuple[bit] || tuple[0];
  },

  getLabel(fieldKey) {
    return this.getFieldUnit(fieldKey);
  },

  isCustomized(fieldKey) {
    const domain = BREW_CONSTANTS.FIELD_REGISTRY[fieldKey];
    const defaultBit = (domain === BREW_CONSTANTS.UNIT_DOMAIN_PERCENTAGE) ? 0 : this.globalMode;
    return this.getFieldBit(fieldKey) !== defaultBit;
  },

  toggle(fieldKey) {
    if (!(fieldKey in BREW_CONSTANTS.FIELD_REGISTRY)) return;
    const domain = BREW_CONSTANTS.FIELD_REGISTRY[fieldKey];
    const currentBit = this.getFieldBit(fieldKey);
    const nextBit = 1 - currentBit; // bit flip

    const defaultBit = (domain === BREW_CONSTANTS.UNIT_DOMAIN_PERCENTAGE) ? 0 : this.globalMode;

    if (nextBit === defaultBit) {
      delete this.overrides[fieldKey];
    } else {
      this.overrides[fieldKey] = nextBit;
    }
    this.saveToStorage();
  },

  resetOverrides() {
    this.overrides = {};
    this.saveToStorage();
  },

  handleModeClick(targetMode) {
    if (targetMode === this.globalMode) {
      if (this.isPure) {
        // Case A: No-op
        return;
      } else {
        // Case B: Reset overrides
        this.resetOverrides();
      }
    } else {
      // Case C: Switch modes
      this.globalMode = targetMode;
      this.overrides = {};
      this.saveToStorage();
    }
  },

  toDisplay(domain, baseValue, fieldKey) {
    if (baseValue == null || isNaN(baseValue)) return 0;
    const domainDef = UNIT_REGISTRY[domain];
    if (!domainDef) return baseValue;
    
    let pref;
    if (fieldKey && fieldKey in BREW_CONSTANTS.FIELD_REGISTRY) {
        pref = this.getFieldUnit(fieldKey);
    } else {
        const tuple = BREW_CONSTANTS.DOMAIN_BINARY_PAIRS[domain];
        pref = tuple ? tuple[domain === BREW_CONSTANTS.UNIT_DOMAIN_PERCENTAGE ? 0 : this.globalMode] : null;
    }
    
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
    
    let pref;
    if (fieldKey && fieldKey in BREW_CONSTANTS.FIELD_REGISTRY) {
        pref = this.getFieldUnit(fieldKey);
    } else {
        const tuple = BREW_CONSTANTS.DOMAIN_BINARY_PAIRS[domain];
        pref = tuple ? tuple[domain === BREW_CONSTANTS.UNIT_DOMAIN_PERCENTAGE ? 0 : this.globalMode] : null;
    }
    
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
};
