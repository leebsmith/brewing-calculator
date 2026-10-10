/**
 * Progressive 12-Step Wizard State Machine (Decoupled Orchestrator).
 */

import Alpine from 'alpinejs';
import { BREW_CONSTANTS } from '../../constants.js';
import { apiFetch } from '../api/firebase.js';
import { createWizardNavigation } from './wizardNavigation.js';
import { createEquipmentManager } from './equipmentManager.js';
import {
  createDefaultMashSchedule,
  applyMashPreset,
  markScheduleCustom,
  sortRestsByTemperature,
  calculateStrikeWaterTempC,
  estimateLimitOfAttenuation,
  isRestTempOutOfRange,
  getCanonicalRest,
  MASH_PRESET_LABELS,
} from '../utils/mashSchedule.js';

export default () => {
  const nav = createWizardNavigation();
  const eqMgr = createEquipmentManager();

  return {
    ...nav,
    ...eqMgr,

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
      // hlt_starting_volume_l is a BATCH-level parameter (see
      // plans/vessel-loss-model.md §5.1): the brewer may under-fill the HLT on
      // a given brew day. It defaults to the equipment profile's
      // max_hlt_volume_l (fill-to-capacity) and is pre-filled by the Step 5
      // input. It is NOT an equipment-profile field.
      hlt_starting_volume_l: BREW_CONSTANTS.DEFAULT_HLT_STARTING_VOLUME_L,

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
      postboil_gravity: 1.0,
      // Solver-resolved mash thickness (L/kg), written by solveBatch(). Null
      // until a solve has run; the Mash Card falls back to the default.
      mash_thickness_l_per_kg: null,
      grain_bill: [],
      late_additions: [],
      // Mash Card schedule (design record Q10). Manifest-scoped, saved with
      // the batch. Dough-in and mash-out are always present; optional rests
      // carry an explicit `enabled` flag so preset switching is idempotent.
      mash: createDefaultMashSchedule(),
      water_profile_id: null,
      hop_schedule: [],
      yeast_id: null,
      yeast_attenuation_pct: null,
      fermentation_schedule: [],
      dry_hops: []
    },

    init() {
      // Event bus listener for step invalidation
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
        }
      });
    },

    // Unit-aware field binding helpers (automatically convert between metric base storage and selected display unit)
    volDisplay(baseVal, fieldKey) {
      return Alpine.store('units') ? Alpine.store('units').toDisplay('volume', baseVal, fieldKey) : baseVal;
    },
    setVolDisplay(obj, prop, displayVal, fieldKey) {
      const baseVal = Alpine.store('units') ? Alpine.store('units').toBase('volume', parseFloat(displayVal), fieldKey) : parseFloat(displayVal);
      obj[prop] = isNaN(baseVal) ? 0 : baseVal;
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
    // Default mash thickness: 1.25 qt/lb (imperial) = 2.6079 L/kg (base).
    // Stored in base units; the display layer converts to qt/lb in imperial
    // mode via the 'step5_intensive_value' compound domain.
    batchSolverIntensiveValue: 2.6079,
    batchSolverResult: null,
    batchSolverError: null,
    batchSolverLoading: false,
    // Set to true whenever a solver input changes after a successful solve.
    // The Finish button is gated on `batchSolverResult && !batchSolverStale`
    // so the user cannot complete Step 5 with a displayed result that no
    // longer reflects the current inputs.
    batchSolverStale: false,

    // Called by any Step 5 input handler. Marks the displayed result stale
    // (if one exists) so the Finish gate re-evaluates.
    markBatchSolverStale() {
      if (this.batchSolverResult) {
        this.batchSolverStale = true;
      }
    },

    // The intensive-value field is polymorphic: under 'r_l_to_g' it is a
    // compound ratio (L/kg <-> gal/lb) and must route through the units
    // store; under 'runoff_ratio' it is a dimensionless number and must
    // bypass conversion entirely. These two helpers dispatch on topology so
    // the partial can bind to a single pair of methods.
    intensiveValueDisplay() {
      if (this.batchSolverTopology === 'r_l_to_g') {
        return this.compoundDisplay(this.batchSolverIntensiveValue, 'step4_intensive_value');
      }
      return this.batchSolverIntensiveValue;
    },
    setIntensiveValueDisplay(displayVal) {
      if (this.batchSolverTopology === 'r_l_to_g') {
        this.setCompoundDisplay(this, 'batchSolverIntensiveValue', displayVal, 'step4_intensive_value');
      } else {
        const parsed = parseFloat(displayVal);
        this.batchSolverIntensiveValue = isNaN(parsed) ? 0 : parsed;
      }
      this.markBatchSolverStale();
    },
    get intensiveValueUnitLabel() {
      if (this.batchSolverTopology === 'r_l_to_g') {
        return Alpine.store('units') ? Alpine.store('units').getLabel('step4_intensive_value') : 'L/kg';
      }
      return 'dimensionless';
    },

    // The mass unit implied by the active compound unit. 'L/kg' -> 'kg',
    // 'qt/lb' -> 'lb'. Used by the intensive-value hint so its phrasing
    // tracks the badge.
    get intensiveValueMassUnit() {
      const label = Alpine.store('units') ? Alpine.store('units').getLabel('step4_intensive_value') : 'L/kg';
      return label === 'qt/lb' ? 'lb' : 'kg';
    },

    // The two topologies interpret the intensive value in different units
    // (L/kg vs. dimensionless), so carrying a value across a topology switch
    // would silently reinterpret it. Reset to a sensible default per topology.
    onTopologyChange() {
      // r_l_to_g default: 1.25 qt/lb = 2.6079 L/kg (base units).
      // runoff_ratio default: 1.0 (dimensionless, equal runnings).
      this.batchSolverIntensiveValue = this.batchSolverTopology === 'r_l_to_g' ? 2.6079 : 1.0;
      this.markBatchSolverStale();
    },

    async solveBatch() {
      this.batchSolverError = null;
      this.batchSolverResult = null;
      this.batchSolverStale = false;

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
        // Under 'r_l_to_g' the stored value is already in base units (L/kg)
        // because setIntensiveValueDisplay() routes through the units store.
        // Under 'runoff_ratio' it is dimensionless and stored as-is. Either
        // way, batchSolverIntensiveValue is the base value the backend wants.
        intensive_value: parseFloat(this.batchSolverIntensiveValue) || 3.0,
        grain_bill,
        s_late_add: 0.0,
        v_kettle_dead: parseFloat(eq.kettle_dead_space_l) || 0.0,
        delta_v_evap: (parseFloat(eq.boil_off_rate_l_per_hr) || 0.0) *
          ((parseFloat(this.manifest.boil_time_min) || 60) / 60.0),
        v_dead: parseFloat(eq.mash_dead_space_l) || 0.0,
        eta_conv: parseFloat(eq.conversion_efficiency) || 0.90,
        f_shrink: parseFloat(eq.shrinkage_pct) || 0.04,
        // HLT water budget. hlt_starting_volume_l is batch-level (the brewer
        // may under-fill the HLT on a given brew day); it defaults to the
        // equipment profile's max_hlt_volume_l. The remaining four are
        // equipment-level and come straight from the profile.
        hlt_starting_volume_l:
          parseFloat(this.manifest.hlt_starting_volume_l) ||
          parseFloat(eq.max_hlt_volume_l) ||
          0.0,
        hlt_dead_space_l: parseFloat(eq.hlt_dead_space_l) || 0.0,
        hlt_transfer_loss_l: parseFloat(eq.hlt_transfer_loss_l) || 0.0,
        hlt_coil_floor_l: parseFloat(eq.hlt_coil_floor_l) || 0.0,
        max_hlt_volume_l: parseFloat(eq.max_hlt_volume_l) || 0.0,
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
          // The raw backend message (which may contain internal diagnostics
          // like bracket bounds and residual values) goes to the console;
          // the user sees a brewer-friendly string keyed by the error code.
          console.error(
            `[batchSolver] validation failed (${detail.code || 'UNKNOWN'}): ${detail.message || 'no message'}`
          );
          this.batchSolverError =
            BREW_CONSTANTS.MSG_SOLVER_ERRORS[detail.code] ||
            BREW_CONSTANTS.MSG_BATCH_SOLVER_FAILED;
          return;
        }

        if (!res.ok) {
          console.error(`[batchSolver] HTTP ${res.status}: ${res.statusText}`);
          this.batchSolverError = BREW_CONSTANTS.MSG_BATCH_SOLVER_FAILED;
          return;
        }

        const result = await res.json();
        this.batchSolverResult = result;
        this.batchSolverStale = false;

        // Write the derived anchors back to the manifest as a denormalized
        // cache. These are OUTPUTS, not inputs -- do not read them back into
        // the solver payload above.
        this.manifest.preboil_volume_l = result.v_pre_boil;
        this.manifest.preboil_gravity = result.cascade.sg_pre_boil;
        this.manifest.postboil_gravity = result.sg_post_boil;
        // v_post_boil is the hot-side kettle balance output (V_pre_boil -
        // delta_v_evap). It is the canonical post-boil volume field; the
        // Step 5 results table displays it via the step5_v_post_boil
        // FIELD_REGISTRY entry.
        this.manifest.v_post_boil = result.cascade.v_post_boil;
        // target_og is the post-boil gravity (the packaged OG at 20 C).
        this.manifest.target_og = result.sg_post_boil;
        // Solver-resolved mash thickness (L/kg). The Mash Card reads this to
        // derive strike water temperature (design record Q3/Q12). It is an
        // OUTPUT of the solver, not the Step 5 intensive-value input.
        this.manifest.mash_thickness_l_per_kg = result.mash_thickness_l_per_kg;
      } catch (err) {
        console.error('[batchSolver] request failed:', err);
        this.batchSolverError = BREW_CONSTANTS.MSG_BATCH_SOLVER_FAILED;
      } finally {
        this.batchSolverLoading = false;
      }
    },

    // Solver-resolved mash thickness, in the tracked `step5_mash_thickness`
    // unit (L/kg <-> qt/lb). The solver writes the base value (L/kg) to
    // batchSolverResult.mash_thickness_l_per_kg; the units store converts at
    // the display boundary. Returns '' when no solve has run.
    mashThicknessDisplay() {
      if (!this.batchSolverResult) return '';
      const base = parseFloat(this.batchSolverResult.mash_thickness_l_per_kg);
      if (isNaN(base)) return '';
      return Alpine.store('units')
        ? Alpine.store('units').toDisplay('mash_thickness', base, 'step5_mash_thickness')
        : base;
    },

    // Runnings ratio r = V_run1 / V_run2, dimensionless. Derived from the
    // cascade volumes; 1.0 is equal runnings. Returns '' when the cascade is
    // unavailable or V_run2 is zero.
    runningsRatioDisplay() {
      if (!this.batchSolverResult || !this.batchSolverResult.cascade) return '';
      const vRun1 = parseFloat(this.batchSolverResult.cascade.v_run1);
      const vRun2 = parseFloat(this.batchSolverResult.cascade.v_run2);
      if (isNaN(vRun1) || isNaN(vRun2) || vRun2 === 0) return '';
      return (vRun1 / vRun2).toFixed(2);
    },

    // --- Step 5: Water Plan summary (derived from batchSolverResult) ---
    // Total water used is the sum of the two volumes the brewer actually
    // draws from the HLT into the process: the strike infusion and the
    // sparge. It is a derived convenience value, not a solver output.
    get totalWaterUsedDisplay() {
      if (!this.batchSolverResult) return 0;
      const total =
        (this.batchSolverResult.cascade.v_strike || 0) +
        (this.batchSolverResult.cascade.v_sparge || 0);
      return this.volDisplay(total, 'step4_v_sparge');
    },

    // Surplus sparge capacity is the volume the HLT can deliver beyond what
    // the cascade demands: v_sparge_deliverable - v_sparge_demand. It is a
    // property of the HLT's state at the moment of sparging (excess deliverable
    // capacity), NOT the liquor left in the HLT after the sparge. Positive
    // only when the HLT is over-filled relative to the sparge requirement; the
    // UI shows the footnote only in that case.
    get surplusSpargeCapacityDisplay() {
      if (!this.batchSolverResult) return 0;
      const surplus =
        (this.batchSolverResult.hlt.v_sparge_deliverable || 0) -
        (this.batchSolverResult.cascade.v_sparge || 0);
      return this.volDisplay(surplus, 'step4_v_sparge');
    },

    get hasSurplusSpargeCapacity() {
      if (!this.batchSolverResult) return false;
      return (
        (this.batchSolverResult.hlt.v_sparge_deliverable || 0) >
        (this.batchSolverResult.cascade.v_sparge || 0)
      );
    },

    // V_sparge_salted is the volume of liquor that will actually be delivered
    // as sparge water, including any HLT top-up. Per
    // plans/vessel-loss-model.md §4.5, sparge salt dosing must be computed
    // against this volume, not the pre-strike HLT volume, or the sparge
    // water's ion concentrations will be diluted by the top-up factor.
    // Derived client-side from the HLT budget; no backend change required.
    get spargeSaltedVolumeDisplay() {
      if (!this.batchSolverResult) return 0;
      const salted =
        (this.batchSolverResult.hlt.v_hlt_after_strike || 0) +
        (this.batchSolverResult.hlt.v_hlt_top_up || 0);
      return this.volDisplay(salted, 'step4_v_sparge_deliverable');
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
    },

    // --- Step 6: Mash Card ---
    // The mash schedule lives in `manifest.mash` (design record Q10). These
    // helpers are thin presentation adapters over the pure helpers in
    // src/utils/mashSchedule.js; all physics and ordering logic lives there.

    get mashPresetLabels() {
      return MASH_PRESET_LABELS;
    },

    // Rests in static canonical order (design record Q2). Used by the
    // selectable-rests checkbox table and the Configure Rests modal, where
    // the order must not shift as the user sets "use" temperatures.
    get canonicalMashRests() {
      if (!this.manifest.mash) return [];
      return this.manifest.mash.rests;
    },

    // Rests in enforced ascending-temperature order (design record Q5). Used
    // by the summary table, which reads as the brew-day timeline. The sort is
    // derived at render time; the stored array order is irrelevant.
    get sortedMashRests() {
      if (!this.manifest.mash) return [];
      return sortRestsByTemperature(this.manifest.mash.rests);
    },

    // Only the enabled rests, in ascending-temperature order. Used by the
    // summary table.
    get enabledMashRests() {
      return this.sortedMashRests.filter((r) => r.enabled);
    },

    getRestDefinition(restId) {
      return getCanonicalRest(restId);
    },

    isRestOutOfRange(restId, useTempC) {
      return isRestTempOutOfRange(restId, useTempC);
    },

    // Apply a named preset. Preset switching is idempotent and preserves the
    // user's custom temps across toggles (design record Q2, Q10).
    onMashPresetChange(presetId) {
      if (!this.manifest.mash) return;
      this.manifest.mash = applyMashPreset(this.manifest.mash, presetId);
    },

    // Any manual edit to a rest flips the dropdown to 'custom' (Q2, Q10).
    onMashRestEdit() {
      if (!this.manifest.mash) return;
      this.manifest.mash = markScheduleCustom(this.manifest.mash);
    },

    // Toggle a rest's `enabled` flag from the checkbox table. Bookends
    // (dough-in, mash-out) are always enabled and their checkboxes are
    // disabled in the partial, so this is only reachable for optional rests.
    toggleMashRest(restId, enabled) {
      if (!this.manifest.mash) return;
      const rest = this.manifest.mash.rests.find((r) => r.rest_id === restId);
      if (!rest) return;
      rest.enabled = Boolean(enabled);
      this.onMashRestEdit();
    },

    // Set a rest's duration from the Configure Rests modal. Durations are
    // stored in minutes and are not unit-aware (design record Q8).
    setRestDuration(rest, displayVal) {
      const parsed = parseFloat(displayVal);
      rest.duration_min = isNaN(parsed) ? null : parsed;
      this.onMashRestEdit();
    },

    // The dough-in rest's "use" temperature is the mash target temperature.
    get doughInTargetTempC() {
      if (!this.manifest.mash) return null;
      const doughIn = this.manifest.mash.rests.find((r) => r.rest_id === 'dough_in');
      return doughIn ? doughIn.use_temp_c : null;
    },

    // Mash thickness in L/kg (base units). Read from the solver-resolved
    // value written by solveBatch() (design record Q3/Q12: the solver
    // pre-determines mash thickness). Falls back to the default
    // 1.25 qt/lb = 2.6079 L/kg until a solve has run.
    get mashThicknessLPerKg() {
      const resolved = parseFloat(this.manifest.mash_thickness_l_per_kg);
      return isNaN(resolved) || resolved <= 0 ? 2.6079 : resolved;
    },

    // Derived strike water temperature, in °C (design record Q3a). Returns
    // null until the dough-in target temperature is set.
    get strikeWaterTempC() {
      const target = this.doughInTargetTempC;
      if (target == null || isNaN(target)) return null;
      const grain = this.manifest.mash ? this.manifest.mash.grain_temp_c : null;
      if (grain == null || isNaN(grain)) return null;
      const result = calculateStrikeWaterTempC(target, grain, this.mashThicknessLPerKg);
      return isNaN(result) ? null : result;
    },

    // Display adapters. The units store converts the metric result at the
    // display boundary; no imperial formula is implemented (design record Q3).
    strikeWaterTempDisplay() {
      if (this.strikeWaterTempC == null) return '';
      return Alpine.store('units')
        ? Alpine.store('units').toDisplay('temperature', this.strikeWaterTempC, 'step5_strike_water_temp_c')
        : this.strikeWaterTempC;
    },

    grainTempDisplay() {
      if (!this.manifest.mash) return '';
      return Alpine.store('units')
        ? Alpine.store('units').toDisplay('temperature', this.manifest.mash.grain_temp_c, 'step5_grain_temp_c')
        : this.manifest.mash.grain_temp_c;
    },

    setGrainTempDisplay(displayVal) {
      if (!this.manifest.mash) return;
      const baseVal = Alpine.store('units')
        ? Alpine.store('units').toBase('temperature', parseFloat(displayVal), 'step5_grain_temp_c')
        : parseFloat(displayVal);
      this.manifest.mash.grain_temp_c = isNaN(baseVal) ? BREW_CONSTANTS.DEFAULT_GRAIN_TEMP_C : baseVal;
    },

    restUseTempDisplay(rest) {
      if (rest.use_temp_c == null) return '';
      return Alpine.store('units')
        ? Alpine.store('units').toDisplay('temperature', rest.use_temp_c, 'step5_rest_use_temp_c')
        : rest.use_temp_c;
    },

    setRestUseTempDisplay(rest, displayVal) {
      const baseVal = Alpine.store('units')
        ? Alpine.store('units').toBase('temperature', parseFloat(displayVal), 'step5_rest_use_temp_c')
        : parseFloat(displayVal);
      rest.use_temp_c = isNaN(baseVal) ? null : baseVal;
      this.onMashRestEdit();
    },

    // Total mash time: sum of every enabled rest's duration (design record Q6).
    get totalMashTimeMin() {
      return this.enabledMashRests.reduce(
        (sum, r) => sum + (parseFloat(r.duration_min) || 0),
        0
      );
    },

    // Limit of Attenuation readout (design record Q6b). Informational only;
    // does not feed the solver.
    get limitOfAttenuation() {
      if (!this.manifest.mash) return null;
      const loa = estimateLimitOfAttenuation(this.manifest.mash.rests);
      return isNaN(loa) ? null : loa;
    },

    limitOfAttenuationDisplay() {
      const loa = this.limitOfAttenuation;
      if (loa == null) return '';
      return Alpine.store('units')
        ? Alpine.store('units').toDisplay('percentage', loa, 'step5_loa')
        : loa;
    }
  };
};
