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
  }
};

document.addEventListener('alpine:init', () => {
  // Global Units Store with Option C toggle support
  Alpine.store('units', {
    activePreset: 'metric', // 'metric' | 'imperial' | 'custom'
    preferences: {
      volume: { unit: 'L', is_customized: false },
      mass: { unit: 'kg', is_customized: false },
      hopMass: { unit: 'g', is_customized: false },
      temperature: { unit: 'C', is_customized: false },
      gravity: { unit: 'SG', is_customized: false }
    },
    promptModalOpen: false,
    pendingPreset: null,

    init() {
      // Hydrate from localStorage if available
      try {
        const saved = localStorage.getItem('brew_unit_preferences');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.activePreset) this.activePreset = parsed.activePreset;
          if (parsed.preferences) this.preferences = { ...this.preferences, ...parsed.preferences };
        }
      } catch (err) {
        console.warn('Failed to load unit preferences from localStorage:', err);
      }
    },

    saveToStorage() {
      try {
        localStorage.setItem('brew_unit_preferences', JSON.stringify({
          activePreset: this.activePreset,
          preferences: this.preferences
        }));
      } catch (err) {
        console.warn('Failed to save unit preferences to localStorage:', err);
      }
    },

    setPreset(presetName) {
      // Check for active custom overrides (Option C)
      const hasCustomOverrides = Object.values(this.preferences).some(p => p.is_customized);
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

      const newUnits = presetName === 'imperial'
        ? { volume: 'gal', mass: 'lb', hopMass: 'oz', temperature: 'F', gravity: 'SG' }
        : { volume: 'L', mass: 'kg', hopMass: 'g', temperature: 'C', gravity: 'SG' };

      for (const [domain, unit] of Object.entries(newUnits)) {
        if (overwriteAll || !this.preferences[domain]?.is_customized) {
          this.preferences[domain] = { unit, is_customized: false };
        }
      }
      this.saveToStorage();
    },

    setFieldUnit(domain, unit) {
      this.activePreset = 'custom';
      const defaultUnit = this.activePreset === 'imperial' ? (domain === 'mass' || domain === 'hopMass' ? 'lb' : 'gal') : (domain === 'mass' || domain === 'hopMass' ? 'kg' : 'L');
      const isCustom = unit !== defaultUnit;
      this.preferences[domain] = { unit, is_customized: isCustom };
      this.saveToStorage();
    },

    toDisplay(domain, baseValue) {
      if (baseValue == null || isNaN(baseValue)) return 0;
      const domainDef = UNIT_REGISTRY[domain];
      if (!domainDef) return baseValue;
      const pref = this.preferences[domain]?.unit || domainDef.base_unit;
      const unitDef = domainDef.units[pref];
      if (!unitDef) return baseValue;

      let converted = 0;
      if (unitDef.to_base) {
        // Temperature or Gravity
        // Note: unitDef.to_base converts display -> base, so from_base converts base -> display
        // Wait, for temperature: C is base. to_base(F) = C. from_base(C) = F.
        converted = unitDef.from_base ? unitDef.from_base(baseValue) : baseValue;
      } else {
        converted = baseValue / unitDef.factor;
      }
      return Number(converted.toFixed(unitDef.precision || 2));
    },

    toBase(domain, displayValue) {
      if (displayValue == null || isNaN(displayValue)) return 0;
      const domainDef = UNIT_REGISTRY[domain];
      if (!domainDef) return displayValue;
      const pref = this.preferences[domain]?.unit || domainDef.base_unit;
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
        }
      });
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
