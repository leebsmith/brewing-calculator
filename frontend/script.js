/**
 * Frontend application logic for Mono-Repo Default.
 * Registers Alpine.js global auth store and components for API interactions.
 */

import Alpine from 'alpinejs';
import collapse from '@alpinejs/collapse';
import { BREW_CONSTANTS } from './constants.js';
import {
  grainYieldToImperialGallonPointsPerPound,
  calculateMetricLiterDegreesPerKg,
  isTracePercentage,
  allocateProportionalPercentages,
} from './src/utils/pureFunctions.js';

// Setup Alpine Native Plugins
window.Alpine = Alpine;
Alpine.plugin(collapse);

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
if (auth && typeof window !== 'undefined' && (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost')) {
  auth.useEmulator(`http://127.0.0.1:${BREW_CONSTANTS.AUTH_EMULATOR_PORT}`); // Use constant for port
}

/**
 * Centralized authenticated API fetch wrapper.
 * Resolves local dev URL (:8000) vs production single-origin rewrites (/api/**)
 * and attaches Bearer ID token if authenticated.
 */
async function apiFetch(path, options = {}) {
  // Detect if running in a local development environment (e.g., Vite dev server on any port)
  // Added '0.0.0.0' as it's commonly used for local development servers.
  const isLocalDev = typeof window !== 'undefined' &&
                     (window.location.hostname === '127.0.0.1' ||
                      window.location.hostname === 'localhost' ||
                      window.location.hostname === '0.0.0.0'); // Added this condition

  // If running locally, explicitly target the backend on the configured API URL.
  // If not local, use relative path (which Firebase Hosting rewrites handle in production).
  const baseUrl = isLocalDev ? BREW_CONSTANTS.BACKEND_API_URL : '';
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
      Plato: {
        label: '°P',
        // Exact numerical inverse of the ASBC cubic below, via Newton-Raphson.
        // Guarantees SG -> Plato -> SG round-trips are lossless.
        to_base: (p) => {
          const sgFromPlato = (plato) =>
            (-1 * 616.868) + (1111.14 * plato) - (630.272 * Math.pow(plato, 2)) + (135.997 * Math.pow(plato, 3));
          // Solve sgFromPlato(sg) = p for sg using Newton-Raphson.
          let sg = 1.0 + (p / 258.6); // initial guess (linearized)
          for (let i = 0; i < 8; i++) {
            const f = sgFromPlato(sg) - p;
            const df = 1111.14 - (2 * 630.272 * sg) + (3 * 135.997 * Math.pow(sg, 2));
            if (Math.abs(df) < 1e-12) break;
            sg -= f / df;
          }
          return sg;
        },
        from_base: (sg) => (-1 * 616.868) + (1111.14 * sg) - (630.272 * Math.pow(sg, 2)) + (135.997 * Math.pow(sg, 3)),
        precision: 1
      }
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
      'L/kg':   { label: 'L/kg',   to_base: (v) => v, from_base: (v) => v, precision: 2 },
      'gal/lb': { label: 'gal/lb', to_base: (v) => v * 8.3454, from_base: (v) => v / 8.3454, precision: 3 }
    }
  },
  extract_potential: {
    base_unit: 'L·°/kg',
    units: {
      'L·°/kg':      { label: 'L·°/kg',      to_base: (v) => v, from_base: (v) => v, precision: 2 },
      'gal·°/lb':   { label: 'gal·°/lb',   to_base: (v) => v, from_base: (v) => v, precision: 2 },
      'pts·gal/lb': { label: 'pts·gal/lb', to_base: (v) => v, from_base: (v) => v, precision: 2 }
    }
  },
  total_extract: {
    // Total kettle extract S_kettle = V2 * G2, a volume x gravity-points
    // product. Base unit is L·° (liter-degrees); imperial is gal·pts
    // (gallon-points). 1 gal = 3.785411784 L, so 1 gal·pts = 3.785411784 L·°.
    base_unit: 'L·°',
    units: {
      'L·°':     { label: 'L·°',     to_base: (v) => v, from_base: (v) => v, precision: 1 },
      'gal·pts': { label: 'gal·pts', to_base: (v) => v * 3.785411784, from_base: (v) => v / 3.785411784, precision: 1 }
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

/**
 * Isolated Wizard Navigation FSM
 * Handles 12-step sequential progression, high-water mark gates, and step status evaluation.
 */
export function createWizardNavigation() {
  return {
    activeStep: 1,
    completedSteps: [],
    highWaterMark: 1,
    dirtySteps: [],
    expansionMode: 'exclusive',

    setActiveStep(stepNumber) {
      if (stepNumber <= this.highWaterMark || this.expansionMode === 'concurrent') {
        this.activeStep = stepNumber;
      }
    },

    markStepComplete(stepNumber) {
      if (!this.completedSteps.includes(stepNumber)) {
        this.completedSteps.push(stepNumber);
      }
      // Clamp advancement to the last implemented step. Without this, completing
      // the final step would set activeStep to a number with no matching panel,
      // collapsing the accordion to nothing.
      const lastStep = BREW_CONSTANTS.WIZARD_STEPS[BREW_CONSTANTS.WIZARD_STEPS.length - 1];
      const nextStep = Math.min(stepNumber + 1, lastStep);
      this.highWaterMark = Math.max(this.highWaterMark, nextStep);
      this.activeStep = nextStep;
      Alpine.store('ui').add(BREW_CONSTANTS.MSG_STEP_CONFIGURED_TEMPLATE(stepNumber), 'success');
    },

    invalidateDownstream(fromStepNumber) {
      // Derived from the canonical downstream roster in constants.js rather
      // than a hardcoded literal, so adding/removing a step only requires
      // editing one place.
      this.dirtySteps = BREW_CONSTANTS.WIZARD_DOWNSTREAM_STEPS.filter(
        step => step > fromStepNumber
      );
    },

    toggleExpansionMode() {
      this.expansionMode = this.expansionMode === 'exclusive' ? 'concurrent' : 'exclusive';
    },

    getStepStatusLabel(stepNum) {
      if (this.completedSteps.includes(stepNum)) return 'Configured';
      if (this.activeStep === stepNum) return 'Active';
      return 'Locked';
    },

    getStepStatusClass(stepNum) {
      if (this.completedSteps.includes(stepNum)) return 'accordion-status-complete';
      if (this.activeStep === stepNum) return 'accordion-status-active';
      return 'accordion-status-locked';
    }
  };
}

/**
 * Isolated Equipment Manager
 * Manages profile drawer CRUD, preset loading, and equipment change event dispatching.
 */
export function createEquipmentManager() {
  return {
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
      mash_transfer_loss_l: BREW_CONSTANTS.DEFAULT_MASH_TRANSFER_LOSS_L,
      kettle_dead_space_l: BREW_CONSTANTS.DEFAULT_KETTLE_DEAD_SPACE_L,
      kettle_transfer_loss_l: BREW_CONSTANTS.DEFAULT_KETTLE_TRANSFER_LOSS_L,
      hlt_dead_space_l: BREW_CONSTANTS.DEFAULT_HLT_DEAD_SPACE_L,
      hlt_transfer_loss_l: BREW_CONSTANTS.DEFAULT_HLT_TRANSFER_LOSS_L,
      trub_loss_l: BREW_CONSTANTS.DEFAULT_TRUB_LOSS_L,
      boil_off_rate_l_per_hr: BREW_CONSTANTS.DEFAULT_BOIL_OFF_RATE_L_PER_HR,
      grain_absorption_factor_l_per_kg: BREW_CONSTANTS.DEFAULT_GRAIN_ABSORPTION_L_PER_KG,
      conversion_efficiency: BREW_CONSTANTS.DEFAULT_CONVERSION_EFFICIENCY,
      shrinkage_pct: BREW_CONSTANTS.DEFAULT_SHRINKAGE_PCT,
      hlt_coil_floor_l: BREW_CONSTANTS.DEFAULT_HLT_COIL_FLOOR_L,
      hlt_starting_volume_l: BREW_CONSTANTS.DEFAULT_HLT_STARTING_VOLUME_L,
    },
    drawerError: null,

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
      const current = (this.manifest && this.manifest.equipment) ? this.manifest.equipment : {};
      this.drawerForm = {
        id: `custom-${Date.now()}`,
        name: 'My Custom Profile',
        description: '',
        max_kettle_volume_l: current.max_kettle_volume_l || 35.0,
        max_mash_tun_volume_l: current.max_mash_tun_volume_l || 35.0,
        max_hlt_volume_l: current.max_hlt_volume_l || 35.0,
        mash_dead_space_l: current.mash_dead_space_l || 0.0,
        mash_transfer_loss_l: current.mash_transfer_loss_l || 0.0,
        kettle_dead_space_l: current.kettle_dead_space_l || 0.0,
        kettle_transfer_loss_l: current.kettle_transfer_loss_l || 0.0,
        hlt_dead_space_l: current.hlt_dead_space_l || 0.0,
        hlt_transfer_loss_l: current.hlt_transfer_loss_l || 0.0,
        trub_loss_l: current.trub_loss_l || 1.5,
        boil_off_rate_l_per_hr: current.boil_off_rate_l_per_hr || 3.0,
        grain_absorption_factor_l_per_kg: current.grain_absorption_factor_l_per_kg || 0.96,
        conversion_efficiency: current.conversion_efficiency || 0.90,
        shrinkage_pct: current.shrinkage_pct || 0.04,
        hlt_coil_floor_l: current.hlt_coil_floor_l || 0.0,
        hlt_starting_volume_l: current.hlt_starting_volume_l || 35.0,
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
        mash_transfer_loss_l: profile.mash_transfer_loss_l !== undefined ? profile.mash_transfer_loss_l : 0.0,
        kettle_dead_space_l: profile.kettle_dead_space_l !== undefined ? profile.kettle_dead_space_l : 0.0,
        kettle_transfer_loss_l: profile.kettle_transfer_loss_l !== undefined ? profile.kettle_transfer_loss_l : 0.0,
        hlt_dead_space_l: profile.hlt_dead_space_l !== undefined ? profile.hlt_dead_space_l : 0.0,
        hlt_transfer_loss_l: profile.hlt_transfer_loss_l !== undefined ? profile.hlt_transfer_loss_l : 0.0,
        trub_loss_l: profile.trub_loss_l,
        boil_off_rate_l_per_hr: profile.boil_off_rate_l_per_hr,
        grain_absorption_factor_l_per_kg: profile.grain_absorption_factor_l_per_kg,
        conversion_efficiency: profile.conversion_efficiency,
        shrinkage_pct: profile.shrinkage_pct,
        hlt_coil_floor_l: profile.hlt_coil_floor_l !== undefined ? profile.hlt_coil_floor_l : 0.0,
        hlt_starting_volume_l: profile.hlt_starting_volume_l !== undefined ? profile.hlt_starting_volume_l : 35.0,
      };
    },

    async submitDrawerProfile() {
      this.drawerError = null;
      try {
        if (!this.drawerForm.name.trim()) {
          throw new Error(BREW_CONSTANTS.MSG_PROFILE_NAME_REQUIRED);
        }
        if (Number(this.drawerForm.max_kettle_volume_l) <= 0) {
          throw new Error(BREW_CONSTANTS.MSG_KETTLE_VOLUME_REQUIRED);
        }
        if (Number(this.drawerForm.boil_off_rate_l_per_hr) <= 0) {
          throw new Error(BREW_CONSTANTS.MSG_BOIL_OFF_REQUIRED);
        }

        const payload = {
          ...this.drawerForm,
          max_kettle_volume_l: Number(this.drawerForm.max_kettle_volume_l),
          max_mash_tun_volume_l: Number(this.drawerForm.max_mash_tun_volume_l),
          max_hlt_volume_l: Number(this.drawerForm.max_hlt_volume_l),
          mash_dead_space_l: Number(this.drawerForm.mash_dead_space_l),
          mash_transfer_loss_l: Number(this.drawerForm.mash_transfer_loss_l || 0),
          kettle_dead_space_l: Number(this.drawerForm.kettle_dead_space_l || 0),
          kettle_transfer_loss_l: Number(this.drawerForm.kettle_transfer_loss_l || 0),
          hlt_dead_space_l: Number(this.drawerForm.hlt_dead_space_l || 0),
          hlt_transfer_loss_l: Number(this.drawerForm.hlt_transfer_loss_l || 0),
          trub_loss_l: Number(this.drawerForm.trub_loss_l),
          boil_off_rate_l_per_hr: Number(this.drawerForm.boil_off_rate_l_per_hr),
          grain_absorption_factor_l_per_kg: Number(this.drawerForm.grain_absorption_factor_l_per_kg),
          conversion_efficiency: Number(this.drawerForm.conversion_efficiency),
          shrinkage_pct: Number(this.drawerForm.shrinkage_pct),
          hlt_coil_floor_l: Number(this.drawerForm.hlt_coil_floor_l || 0),
          hlt_starting_volume_l: Number(this.drawerForm.hlt_starting_volume_l || 0),
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
        if (this.manifest && this.manifest.equipment_profile_id === profileId) {
          const first = Alpine.store('equipment').profiles[0];
          if (first) this.selectProfile(first.id);
        }
      } catch {
        // error handled in store
      }
    },

    selectProfile(profileId) {
      if (!this.manifest) return;
      this.manifest.equipment_profile_id = profileId;
      if (!profileId) return;

      const preset = Alpine.store('equipment').getProfileById(profileId);
      if (preset) {
        this.manifest.equipment = {
          max_kettle_volume_l: preset.max_kettle_volume_l,
          max_mash_tun_volume_l: preset.max_mash_tun_volume_l,
          max_hlt_volume_l: preset.max_hlt_volume_l,
          mash_dead_space_l: preset.mash_dead_space_l,
          mash_transfer_loss_l: preset.mash_transfer_loss_l !== undefined ? preset.mash_transfer_loss_l : 0.0,
          kettle_dead_space_l: preset.kettle_dead_space_l !== undefined ? preset.kettle_dead_space_l : 0.0,
          kettle_transfer_loss_l: preset.kettle_transfer_loss_l !== undefined ? preset.kettle_transfer_loss_l : 0.0,
          hlt_dead_space_l: preset.hlt_dead_space_l !== undefined ? preset.hlt_dead_space_l : 0.0,
          hlt_transfer_loss_l: preset.hlt_transfer_loss_l !== undefined ? preset.hlt_transfer_loss_l : 0.0,
          trub_loss_l: preset.trub_loss_l,
          boil_off_rate_l_per_hr: preset.boil_off_rate_l_per_hr,
          grain_absorption_factor_l_per_kg: preset.grain_absorption_factor_l_per_kg,
          conversion_efficiency: preset.conversion_efficiency,
          shrinkage_pct: preset.shrinkage_pct,
          hlt_coil_floor_l: preset.hlt_coil_floor_l !== undefined ? preset.hlt_coil_floor_l : 0.0,
          hlt_starting_volume_l: preset.hlt_starting_volume_l !== undefined ? preset.hlt_starting_volume_l : 35.0,
        };
        this.onEquipmentChange();
      }
    },

    onEquipmentChange() {
      if (this.$dispatch) {
        this.$dispatch('recipe:recalculate', { payload: this.manifest });
        this.$dispatch('wizard:invalidate', { step: 1 });
      } else {
        window.dispatchEvent(new CustomEvent('recipe:recalculate', { detail: { payload: this.manifest } }));
        window.dispatchEvent(new CustomEvent('wizard:invalidate', { detail: { step: 1 } }));
      }
    },

    get isCustomModified() {
      if (!this.manifest) return false;
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
        Number(eq.mash_transfer_loss_l) !== Number(preset.mash_transfer_loss_l) ||
        Number(eq.kettle_dead_space_l) !== Number(preset.kettle_dead_space_l) ||
        Number(eq.kettle_transfer_loss_l) !== Number(preset.kettle_transfer_loss_l) ||
        Number(eq.hlt_dead_space_l) !== Number(preset.hlt_dead_space_l) ||
        Number(eq.hlt_transfer_loss_l) !== Number(preset.hlt_transfer_loss_l) ||
        Number(eq.trub_loss_l) !== Number(preset.trub_loss_l) ||
        Number(eq.boil_off_rate_l_per_hr) !== Number(preset.boil_off_rate_l_per_hr) ||
        Number(eq.grain_absorption_factor_l_per_kg) !== Number(preset.grain_absorption_factor_l_per_kg) ||
        Number(eq.conversion_efficiency) !== Number(preset.conversion_efficiency) ||
        Number(eq.shrinkage_pct) !== Number(preset.shrinkage_pct) ||
        Number(eq.hlt_coil_floor_l) !== Number(preset.hlt_coil_floor_l) ||
        Number(eq.hlt_starting_volume_l) !== Number(preset.hlt_starting_volume_l)
      );
    }
  };
}

// Global Units Store with Binary Invariant & Sparse Exceptions
Alpine.store('units', {
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
    return unitsStore.globalMode === BREW_CONSTANTS.UNIT_MODES.METRIC;
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
    const isImperial = unitsStore ? (unitsStore.globalMode === BREW_CONSTANTS.UNIT_MODES.IMPERIAL) : false;

    const baseVal = isImperial
      ? grainYieldToImperialGallonPointsPerPound(weightedFrac)
      : calculateMetricLiterDegreesPerKg(weightedFrac);
    return unitsStore ? unitsStore.toDisplay('extract_potential', baseVal) : Number(baseVal.toFixed(1));
  },

  get weightedPotentialUnit() {
    const unitsStore = Alpine.store('units');
    const isImperial = unitsStore ? (unitsStore.globalMode === BREW_CONSTANTS.UNIT_MODES.IMPERIAL) : false;
    if (isImperial) return 'gal·°/lb';
    return unitsStore ? unitsStore.getFieldUnit('extract_potential') : 'L·°/kg';
  },

  maltColorDisplay(row) {
    const srm = parseFloat(row.color_srm) || 0;
    const unitsStore = Alpine.store('units');
    return unitsStore ? unitsStore.toDisplay('color', srm) : Number(srm.toFixed(1));
  },

  maltPotentialDisplay(row) {
    const frac = parseFloat(row.potential_fraction) || 0.75;
    const unitsStore = Alpine.store('units');
    const isImperial = unitsStore ? (unitsStore.globalMode === BREW_CONSTANTS.UNIT_MODES.IMPERIAL) : false;

    const baseVal = isImperial
      ? grainYieldToImperialGallonPointsPerPound(frac)
      : calculateMetricLiterDegreesPerKg(frac);
    return unitsStore ? unitsStore.toDisplay('extract_potential', baseVal) : Number(baseVal.toFixed(1));
  },

  get weightedContributionUnit() {
    const unitsStore = Alpine.store('units');
    const isImperial = unitsStore ? (unitsStore.globalMode === BREW_CONSTANTS.UNIT_MODES.IMPERIAL) : false;
    if (isImperial) return 'gal·°/lb';
    return unitsStore ? unitsStore.getFieldUnit('extract_potential') : 'L·°/kg';
  },

  maltWeightedContributionDisplay(row) {
    // Weighted contribution = potential (in the active extract-potential unit)
    // scaled by the malt's share of the grist (pct / 100). This is the
    // per-row contribution to the grist's weighted extract potential.
    const frac = parseFloat(row.potential_fraction) || 0.75;
    const share = (parseFloat(row.pct) || 0) / 100.0;
    const unitsStore = Alpine.store('units');
    const isImperial = unitsStore ? (unitsStore.globalMode === BREW_CONSTANTS.UNIT_MODES.IMPERIAL) : false;

    const baseVal = isImperial
      ? grainYieldToImperialGallonPointsPerPound(frac)
      : calculateMetricLiterDegreesPerKg(frac);
    const weightedBase = baseVal * share;
    return unitsStore ? unitsStore.toDisplay('extract_potential', weightedBase) : Number(weightedBase.toFixed(1));
  },

  get totalParts() {
    const rows = this.modalOpen ? this.draftMajorMalts : this.majorMalts;
    return rows.reduce((sum, r) => sum + (parseFloat(r.parts) || 0), 0);
  },

  get totalWeightedContributionDisplay() {
    // Relies on the Hamilton largest-remainder invariant: normalizeDraft()
    // guarantees Σ pct === 100.0 for any non-empty bill, and majorMalts is
    // only ever written from an already-normalized draft (saveModal). So the
    // pct/100 share below sums to exactly 1.0, making this total equal to the
    // percentage-weighted average potential shown in the adjacent column.
    // If a future code path can persist a non-normalized bill, divide by
    // Σ pct instead of assuming 100.0.
    const rows = this.modalOpen ? this.draftMajorMalts : this.majorMalts;
    const unitsStore = Alpine.store('units');
    const isImperial = unitsStore ? (unitsStore.globalMode === BREW_CONSTANTS.UNIT_MODES.IMPERIAL) : false;

    const total = rows.reduce((sum, r) => {
      const frac = parseFloat(r.potential_fraction) || 0.75;
      const share = (parseFloat(r.pct) || 0) / 100.0;
      const baseVal = isImperial
        ? grainYieldToImperialGallonPointsPerPound(frac)
        : calculateMetricLiterDegreesPerKg(frac);
      return sum + (baseVal * share);
    }, 0);

    return unitsStore ? unitsStore.toDisplay('extract_potential', total) : Number(total.toFixed(1));
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

    // Delegate the Hamilton largest-remainder allocation to a pure helper.
    const percentages = allocateProportionalPercentages(rows);
    rows.forEach((r, idx) => {
      r.pct = percentages[idx];
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
    return isTracePercentage(pct);
  },

  get maxMajorMalts() {
    return BREW_CONSTANTS.MAX_MAJOR_MALTS;
  },

  get isAtMajorMaltLimit() {
    return this.draftMajorMalts.length >= BREW_CONSTANTS.MAX_MAJOR_MALTS;
  },

  addMajorMalt(catalogItem) {
    if (this.draftMajorMalts.length >= BREW_CONSTANTS.MAX_MAJOR_MALTS) {
      Alpine.store('ui').add(
        `Maximum of ${BREW_CONSTANTS.MAX_MAJOR_MALTS} major malts reached.`,
        'error'
      );
      return;
    }
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
    if (this.draftMajorMalts.length >= BREW_CONSTANTS.MAX_MAJOR_MALTS) {
      Alpine.store('ui').add(
        `Maximum of ${BREW_CONSTANTS.MAX_MAJOR_MALTS} major malts reached.`,
        'error'
      );
      return;
    }
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

    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
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

    if (this.$cleanup) {
        this.$cleanup(() => unsubscribe());
    }
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

// Global Catalog Store for Fermentables (Malts & Sugars) and Yeasts
Alpine.store('catalog', {
  malts: [],
  sugars: [],
  yeasts: [],
  loading: false,
  error: null,
  loaded: false,

  async fetchCatalog() {
    if (this.loaded || this.loading) return;
    this.loading = true;
    this.error = null;
    try {
      const [fermentablesRes, yeastsRes] = await Promise.all([
        apiFetch('/api/fermentables'),
        apiFetch('/api/yeasts'),
      ]);
      if (!fermentablesRes.ok) {
        throw new Error(`Failed to load fermentables catalog: ${fermentablesRes.status}`);
      }
      if (!yeastsRes.ok) {
        throw new Error(`Failed to load yeast catalog: ${yeastsRes.status}`);
      }
      const fermentablesData = await fermentablesRes.json();
      const yeastsData = await yeastsRes.json();
      this.malts = fermentablesData.malts || [];
      this.sugars = fermentablesData.sugars || [];
      this.yeasts = yeastsData.yeasts || [];
      this.loaded = true;
    } catch (err) {
      this.error = err.message;
      console.error('Error fetching catalog:', err);
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
  },

  getYeastById(id) {
    return this.yeasts.find(y => y.id === id) || null;
  },

  get yeastManufacturers() {
    return [...new Set(this.yeasts.map(y => y.manufacturer))].sort();
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
      Alpine.store('ui').add(BREW_CONSTANTS.MSG_EQUIPMENT_PROFILE_DELETED, 'info');
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

// Decoupled Presentation FSM: Wizard Navigation Component
Alpine.data('wizardNavigation', () => createWizardNavigation());

// Decoupled Presentation State: Equipment Manager Component
Alpine.data('equipmentManager', () => createEquipmentManager());

// Progressive 12-Step Wizard State Machine (Decoupled Orchestrator)
Alpine.data('wizard', () => {
  const nav = createWizardNavigation();
  const eqMgr = createEquipmentManager();

  return {
    ...nav,
    ...eqMgr,

    // Generalized 2-DOF solver: which two variables are solved outputs.
    // Default (V2, G2) preserves legacy Option B behavior.
    solverOutputs: [...BREW_CONSTANTS.SOLVER_DEFAULT_OUTPUTS],
    solverError: null,

    // Metadata for the 6 solver pills (labels + unit domains), sourced from constants.
    solverVariables: BREW_CONSTANTS.SOLVER_VARIABLES,

    // Working Recipe Manifest
    manifest: {
      name: BREW_CONSTANTS.DEFAULT_BATCH_NAME,
      equipment_profile_id: BREW_CONSTANTS.DEFAULT_EQUIPMENT_PROFILE_ID,
      equipment: {
        max_kettle_volume_l: BREW_CONSTANTS.DEFAULT_MAX_KETTLE_VOLUME_L,
        max_mash_tun_volume_l: BREW_CONSTANTS.DEFAULT_MAX_MASH_TUN_VOLUME_L,
        max_hlt_volume_l: BREW_CONSTANTS.DEFAULT_MAX_HLT_VOLUME_L,
        mash_dead_space_l: BREW_CONSTANTS.DEFAULT_MASH_DEAD_SPACE_L,
        mash_transfer_loss_l: BREW_CONSTANTS.DEFAULT_MASH_TRANSFER_LOSS_L,
        kettle_dead_space_l: BREW_CONSTANTS.DEFAULT_KETTLE_DEAD_SPACE_L,
        kettle_transfer_loss_l: BREW_CONSTANTS.DEFAULT_KETTLE_TRANSFER_LOSS_L,
        hlt_dead_space_l: BREW_CONSTANTS.DEFAULT_HLT_DEAD_SPACE_L,
        hlt_transfer_loss_l: BREW_CONSTANTS.DEFAULT_HLT_TRANSFER_LOSS_L,
        trub_loss_l: BREW_CONSTANTS.DEFAULT_TRUB_LOSS_L,
        boil_off_rate_l_per_hr: BREW_CONSTANTS.DEFAULT_BOIL_OFF_RATE_L_PER_HR,
        grain_absorption_factor_l_per_kg: BREW_CONSTANTS.DEFAULT_GRAIN_ABSORPTION_L_PER_KG,
        conversion_efficiency: BREW_CONSTANTS.DEFAULT_CONVERSION_EFFICIENCY,
        shrinkage_pct: BREW_CONSTANTS.DEFAULT_SHRINKAGE_PCT,
        hlt_coil_floor_l: BREW_CONSTANTS.DEFAULT_HLT_COIL_FLOOR_L,
        hlt_starting_volume_l: BREW_CONSTANTS.DEFAULT_HLT_STARTING_VOLUME_L,
      },
      // --- Batch Sparge Solver inputs (Step 5) ---
      // v_ferm is the extensive "Target Endpoint" (unified-treatment.md §3):
      // the user's desired cold fermenter volume. The Python solver's Phase 2
      // reverses kettle losses + boil-off to derive V_pre_boil from it.
      v_ferm: BREW_CONSTANTS.DEFAULT_V_FERM_L,
      // target_abv is the cold-side ABV target consumed by Phase 1. Always
      // expressed as a percentage (no unit toggle).
      target_abv: BREW_CONSTANTS.DEFAULT_TARGET_ABV,
      boil_time_min: BREW_CONSTANTS.DEFAULT_BOIL_TIME_MIN,

      // --- Solver-written derived anchors (denormalized cache) ---
      // These are OUTPUTS of solveBatch(), not user inputs. They are written
      // back to the manifest so downstream steps (water chemistry, hops, etc.)
      // can read them without knowing the solver's response shape. Do NOT
      // treat them as authoritative inputs; the Python solver owns them.
      //
      // NOTE: there is no separate `target_volume_l` field. Per
      // unified-treatment.md §3, the canonical name for the packaged volume
      // target is `v_ferm` (above), which is the user input. The solver's
      // derived packaged volume is `v_ferm` itself (the target is met by
      // construction), so a second field would be redundant.
      target_og: BREW_CONSTANTS.DEFAULT_TARGET_OG,
      preboil_volume_l: 0.0,
      preboil_gravity: 1.0,
      postboil_volume_l: 0.0,
      postboil_gravity: 1.0,
      grain_bill: [],
      late_additions: [],
      mash_profile: [],
      water_profile_id: null,
      hop_schedule: [],
      yeast_id: null,
      yeast_attenuation_pct: null,
      fermentation_schedule: [],
      dry_hops: []
    },

    init() {
      // Dev-time guardrail: every declared wizard step must have a matching
      // panel in the DOM. Catches partial-numbering drift at load time rather
      // than at click time.
      if (typeof document !== 'undefined') {
        const missing = BREW_CONSTANTS.WIZARD_STEPS.filter(
          (n) => !document.getElementById(`step-panel-${n}`)
        );
        if (missing.length > 0) {
          console.warn(
            `[wizard] Declared steps have no matching #step-panel-N in the DOM: ${missing.join(', ')}`
          );
        }
      }

      // Event bus listener for recipe recalculation & step invalidation
      window.addEventListener('recipe:recalculate', () => {
        this.runBoilSolver();
      });
      window.addEventListener('wizard:invalidate', (e) => {
        if (e.detail && e.detail.step) {
          this.invalidateDownstream(e.detail.step);
        }
      });

      // Auto-load matching preset once equipment profiles are available.
      // Always re-sync the manifest from the selected profile (falling back to
      // the first available profile) so the manifest can never hold stale
      // equipment values from a previous session or an older seed revision.
      this.$watch('$store.equipment.profiles', (profiles) => {
        if (profiles && profiles.length > 0) {
          const targetId = this.manifest.equipment_profile_id || profiles[0].id;
          this.selectProfile(targetId);
          this.runBoilSolver();
        }
      });
      this.runBoilSolver();
    },

    // --- Generalized 2-DOF Solver Actions ---

    isSolverOutput(varKey) {
      return this.solverOutputs.includes(varKey);
    },

    // Proactive gating: a pill is disabled if selecting it would form a singular pair.
    isSolverPillDisabled(varKey) {
      if (this.solverOutputs.includes(varKey)) return false;
      if (this.solverOutputs.length < 1) return false;
      const candidate = this.solverOutputs[0];
      return !ThermodynamicSolver.validateOutputPair(candidate, varKey).valid;
    },

    solverPillDisabledReason(varKey) {
      if (this.solverOutputs.length < 1) return '';
      const candidate = this.solverOutputs[0];
      const res = ThermodynamicSolver.validateOutputPair(candidate, varKey);
      return res.valid ? '' : res.reason;
    },

    toggleSolverPill(varKey) {
      const idx = this.solverOutputs.indexOf(varKey);
      if (idx >= 0) {
        // Deselect (n -> n-1)
        this.solverOutputs.splice(idx, 1);
      } else {
        if (this.solverOutputs.length >= 2) return; // frozen at 2
        if (this.isSolverPillDisabled(varKey)) return;
        this.solverOutputs.push(varKey);
      }
      this.runBoilSolver();
    },

    setBoilSolverMode(mode) {
      // Legacy compatibility shim: map old Option A/B to the new pill pairs.
      this.solverOutputs = mode === 'option_a' ? ['R_boil', 'G2'] : ['V2', 'G2'];
      this.runBoilSolver();
    },

    // Unit-aware field binding helpers (automatically convert between metric base storage and selected display unit)
    volDisplay(baseVal, fieldKey) {
      return Alpine.store('units') ? Alpine.store('units').toDisplay('volume', baseVal, fieldKey) : baseVal;
    },
    setVolDisplay(obj, prop, displayVal, fieldKey) {
      const baseVal = Alpine.store('units') ? Alpine.store('units').toBase('volume', parseFloat(displayVal), fieldKey) : parseFloat(displayVal);
      obj[prop] = isNaN(baseVal) ? 0 : baseVal;
      if (this.$dispatch) {
        this.$dispatch('recipe:recalculate');
      } else {
        this.runBoilSolver();
      }
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
      if (this.$dispatch) {
        this.$dispatch('recipe:recalculate');
      } else {
        this.runBoilSolver();
      }
    },

    onBatchMetaChange() {
      this.runBoilSolver();
      this.invalidateDownstream(2);
    },

    runBoilSolver() {
      if (this.solverOutputs.length !== 2) {
        // Not enough outputs selected yet; fall back to legacy default solve.
        ThermodynamicSolver.solveBoil(this.manifest);
        this.solverError = null;
        return;
      }

      // The solver core operates on base storage units (volume -> L,
      // gravity -> SG, time -> hours) and internally converts SG to gravity
      // points for the linear solute-conservation equation. The manifest
      // already stores gravity in SG, so we pass it through unchanged.
      const [a, b] = this.solverOutputs;
      const result = ThermodynamicSolver.solve2DOF(this.manifest, a, b);
      this.solverError = result.ok ? null : result.error;

      if (result.ok) {
        const s = result.solved;
        // Solved gravity values are in gravity points; convert back to SG
        // (the manifest's base storage unit) before writing.
        if (s.V1 !== undefined) this.manifest.preboil_volume_l = Number(s.V1.toFixed(2));
        if (s.G1 !== undefined) this.manifest.preboil_gravity = Number(ThermodynamicSolver.pointsToSg(s.G1).toFixed(4));
        if (s.V2 !== undefined) this.manifest.postboil_volume_l = Number(s.V2.toFixed(2));
        if (s.G2 !== undefined) this.manifest.postboil_gravity = Number(ThermodynamicSolver.pointsToSg(s.G2).toFixed(4));
        if (s.R_boil !== undefined) this.manifest.equipment.boil_off_rate_l_per_hr = Number(s.R_boil.toFixed(2));
        if (s.t !== undefined) this.manifest.boil_time_min = Number((s.t * 60).toFixed(1));
      }

      // Downstream chilling bridge (packaged volume + target OG).
      // Loss_postboil collapses trub + kettle dead space + kettle transfer
      // loss into a single additive scalar (see vessel-loss-model.md 5.2).
      const eq = this.manifest.equipment || {};
      const postBoilLoss = ThermodynamicSolver.calculatePostBoilLoss(
        eq.trub_loss_l,
        eq.kettle_dead_space_l,
        eq.kettle_transfer_loss_l
      );
      const shrinkage = parseFloat(eq.shrinkage_pct) || 0.04;
      const vPost = parseFloat(this.manifest.postboil_volume_l) || 0;
      const vTarget = ThermodynamicSolver.calculatePackagedVolume(vPost, postBoilLoss, shrinkage);
      this.manifest.target_volume_l = vTarget;

      // Total extract in gravity-point-liters: V1 * sgToPoints(SG1).
      // calculateTargetOg expects gravity POINTS (not point-liters), so we
      // divide the total extract by the target volume first.
      const extractPointsTotal = (parseFloat(this.manifest.preboil_volume_l) || 0) *
        ThermodynamicSolver.sgToPoints(this.manifest.preboil_gravity);
      const targetOgPoints = vTarget > 0 ? (extractPointsTotal / vTarget) : 0;
      this.manifest.target_og = ThermodynamicSolver.calculateTargetOg(
        targetOgPoints, 1.0, parseFloat(this.manifest.postboil_gravity) || 1.050
      );
    },

    // Step 2 Synthesized Outputs (delegated to ThermodynamicSolver)
    get targetOgPoints() {
      return ThermodynamicSolver.calculateOgPoints(this.manifest.target_og);
    },

    get targetKettleExtract() {
      // S_kettle = V2 * G2 (post-boil kettle extract), per the solver spec.
      // This is the value that feeds Step 3's grist mass calculation.
      // Stored/returned in the base metric unit (L·°).
      return ThermodynamicSolver.calculateKettleExtract(
        this.manifest.postboil_volume_l,
        this.manifest.postboil_gravity
      );
    },

    get targetKettleExtractDisplay() {
      // Convert the base L·° value into the active total-extract display unit
      // (L·° in metric, gal·pts in imperial) so the summary card tracks the
      // global unit mode.
      const baseVal = parseFloat(this.targetKettleExtract) || 0;
      const unitsStore = Alpine.store('units');
      return unitsStore ? unitsStore.toDisplay('total_extract', baseVal) : baseVal;
    },

    get targetKettleExtractUnit() {
      const unitsStore = Alpine.store('units');
      return unitsStore ? unitsStore.getFieldUnit('total_extract') : 'L·°';
    },

    // Step Validation Override for Wizard Workflow
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

      // Validate Step 2 (Yeast Selection)
      if (stepNumber === 2) {
        if (!this.manifest.yeast_id) {
          Alpine.store('ui').add(BREW_CONSTANTS.MSG_YEAST_REQUIRED, 'error');
          return;
        }
        const yeast = Alpine.store('catalog').getYeastById(this.manifest.yeast_id);
        if (yeast) {
          // Both the manifest and the catalog store attenuation as a fraction.
          const att = Number(this.manifest.yeast_attenuation_pct);
          if (isNaN(att) || att < yeast.low_attenuation || att > yeast.high_attenuation) {
            Alpine.store('ui').add(
              BREW_CONSTANTS.MSG_YEAST_ATTENUATION_RANGE(yeast.low_attenuation, yeast.high_attenuation),
              'error'
            );
            return;
          }
        }
      }

      nav.markStepComplete.call(this, stepNumber);
    },

    // --- Step 5: Batch Sparge Solver ---
    // Constraint topology for the new POST /api/solve-batch endpoint.
    // 'r_l_to_g'      -> {V_pre_boil, R_L:G}  (intensive_value is L/kg)
    // 'runoff_ratio'  -> {V_pre_boil, r}      (intensive_value is dimensionless)
    batchSolverTopology: 'r_l_to_g',
    batchSolverIntensiveValue: 3.0,
    batchSolverResult: null,
    batchSolverError: null,
    batchSolverLoading: false,

    async solveBatch() {
      this.batchSolverError = null;
      this.batchSolverResult = null;

      const rows = Alpine.store('maltGrid').majorMalts;
      if (!rows || rows.length === 0) {
        this.batchSolverError = BREW_CONSTANTS.MSG_BATCH_SOLVER_NO_GRIST;
        console.error('[batchSolver]', this.batchSolverError);
        return;
      }

      // Grain-bill mapping from the Hamilton-normalized majorMalts grid.
      // The Hamilton largest-remainder allocator guarantees Σ pct === 100.0
      // for any non-empty bill (see maltGrid.normalizeDraft), so w_i = pct/100
      // sums to exactly 1.0 and no client-side re-normalization is needed.
      const grain_bill = rows.map((r) => ({
        w_i: (parseFloat(r.pct) || 0) / 100.0,
        dbfg_i: parseFloat(r.potential_fraction) || 0.0,
        mc_i: parseFloat(r.moisture_pct) || 0.0,
      }));

      const eq = this.manifest.equipment || {};
      const payload = {
        target_abv: parseFloat(this.manifest.target_abv) || BREW_CONSTANTS.DEFAULT_TARGET_ABV,
        apparent_attenuation: parseFloat(this.manifest.yeast_attenuation_pct) || 0.75,
        v_ferm: parseFloat(this.manifest.v_ferm) || BREW_CONSTANTS.DEFAULT_V_FERM_L,
        topology: this.batchSolverTopology,
        intensive_value: parseFloat(this.batchSolverIntensiveValue) || 3.0,
        grain_bill,
        s_late_add: 0.0,
        v_kettle_dead: parseFloat(eq.kettle_dead_space_l) || 0.0,
        delta_v_evap: (parseFloat(eq.boil_off_rate_l_per_hr) || 0.0) *
          ((parseFloat(this.manifest.boil_time_min) || 60) / 60.0),
        v_dead: parseFloat(eq.mash_dead_space_l) || 0.0,
        eta_conv: parseFloat(eq.conversion_efficiency) || 0.90,
        f_shrink: parseFloat(eq.shrinkage_pct) || 0.04,
      };

      this.batchSolverLoading = true;
      try {
        const res = await apiFetch('/api/solve-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.status === 422) {
          const errData = await res.json().catch(() => ({}));
          const detail = errData.detail || {};
          // Log-only per spec: no toast for solver validation failures.
          console.error(
            `[batchSolver] validation failed (${detail.code || 'UNKNOWN'}): ${detail.message || 'no message'}`
          );
          this.batchSolverError = detail.message || BREW_CONSTANTS.MSG_BATCH_SOLVER_FAILED;
          return;
        }

        if (!res.ok) {
          console.error(`[batchSolver] HTTP ${res.status}: ${res.statusText}`);
          this.batchSolverError = BREW_CONSTANTS.MSG_BATCH_SOLVER_FAILED;
          return;
        }

        const result = await res.json();
        this.batchSolverResult = result;

        // Write the derived anchors back to the manifest as a denormalized
        // cache. These are OUTPUTS, not inputs -- do not read them back into
        // the solver payload above.
        this.manifest.preboil_volume_l = result.v_pre_boil;
        this.manifest.preboil_gravity = result.cascade.sg_pre_boil;
        this.manifest.postboil_volume_l = result.cascade.v_post_boil;
        this.manifest.postboil_gravity = result.sg_post_boil;
        // target_og is the post-boil gravity (the packaged OG at 20 C).
        this.manifest.target_og = result.sg_post_boil;
      } catch (err) {
        console.error('[batchSolver] request failed:', err);
        this.batchSolverError = BREW_CONSTANTS.MSG_BATCH_SOLVER_FAILED;
      } finally {
        this.batchSolverLoading = false;
      }
    },

    // --- Step 2: Yeast Selection ---
    yeastSearchQuery: '',
    yeastManufacturerFilter: '',

    get filteredYeasts() {
      const all = Alpine.store('catalog') ? Alpine.store('catalog').yeasts : [];
      const q = (this.yeastSearchQuery || '').trim().toLowerCase();
      const mfr = this.yeastManufacturerFilter;
      return all.filter(y => {
        if (mfr && y.manufacturer !== mfr) return false;
        if (q) {
          const matchName = y.name && y.name.toLowerCase().includes(q);
          const matchMfr = y.manufacturer && y.manufacturer.toLowerCase().includes(q);
          if (!matchName && !matchMfr) return false;
        }
        return true;
      });
    },

    // Bounded view of the filtered yeast set. The full filtered list is still
    // available via `filteredYeasts` (used for the result counter), but only
    // the first MAX_VISIBLE_YEASTS rows are rendered into the DOM to bound
    // both the DOM node count and the accordion panel height.
    get visibleYeasts() {
      return this.filteredYeasts.slice(0, BREW_CONSTANTS.MAX_VISIBLE_YEASTS);
    },

    get yeastResultCount() {
      return this.filteredYeasts.length;
    },

    get isYeastListTruncated() {
      return this.filteredYeasts.length > BREW_CONSTANTS.MAX_VISIBLE_YEASTS;
    },

    get yeastManufacturers() {
      return Alpine.store('catalog') ? Alpine.store('catalog').yeastManufacturers : [];
    },

    get selectedYeast() {
      if (!this.manifest.yeast_id) return null;
      return Alpine.store('catalog').getYeastById(this.manifest.yeast_id);
    },

    selectYeast(yeastId) {
      this.manifest.yeast_id = yeastId;
      const yeast = Alpine.store('catalog').getYeastById(yeastId);
      if (yeast) {
        this.manifest.yeast_attenuation_pct = yeast.attenuation_pct;
      }
    },

    clearYeastSelection() {
      this.manifest.yeast_id = null;
      this.manifest.yeast_attenuation_pct = null;
    },

    onYeastAttenuationChange(displayVal) {
      const yeast = this.selectedYeast;
      if (!yeast) return;
      // Both the catalog and the manifest store attenuation as a FRACTION
      // (0..1), which is the percentage domain's base unit. toBase() converts
      // the display value (e.g. "78" in % mode) straight to a fraction.
      const fraction = Alpine.store('units')
        ? Alpine.store('units').toBase('percentage', parseFloat(displayVal), 'step2_yeast_attenuation_pct')
        : parseFloat(displayVal) / 100;
      if (isNaN(fraction)) return;
      if (fraction < yeast.low_attenuation || fraction > yeast.high_attenuation) {
        Alpine.store('ui').add(
          BREW_CONSTANTS.MSG_YEAST_ATTENUATION_RANGE(yeast.low_attenuation, yeast.high_attenuation),
          'error'
        );
        return;
      }
      this.manifest.yeast_attenuation_pct = fraction;
    },

    yeastAttenuationDisplay() {
      if (this.manifest.yeast_attenuation_pct == null) return '';
      // The manifest already stores a fraction, which is the percentage
      // domain's base unit, so it can be passed to toDisplay() directly.
      return Alpine.store('units')
        ? Alpine.store('units').toDisplay('percentage', this.manifest.yeast_attenuation_pct, 'step2_yeast_attenuation_pct')
        : this.manifest.yeast_attenuation_pct;
    }
  };
});

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
      Alpine.store('ui').add(BREW_CONSTANTS.MSG_PING_PROCESSED_SUCCESSFULLY, 'success');
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

// Finally, start Alpine natively
Alpine.start();
