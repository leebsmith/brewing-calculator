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
      'gal/lb': { label: 'gal/lb', to_base: (v) => v * 0.5217, from_base: (v) => v / 0.5217, precision: 3 }
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
 * Isolated Thermodynamic Domain Logic
 * Pure physical and mathematical calculations for boil dynamics,
 * evaporation, extract conservation, and packaging volumes.
 */
export class ThermodynamicSolver {
  /**
   * Calculates post-boil hot volume after evaporation.
   * V_post = max(0, V_pre - (rate * time))
   */
  static calculatePostBoil(preVolume, boilOffRate, timeHours) {
    const vPre = parseFloat(preVolume) || 0;
    const rate = parseFloat(boilOffRate) || 0;
    const hrs = parseFloat(timeHours) || 0;
    return Math.max(0, vPre - (rate * hrs));
  }

  /**
   * Calculates evaporation rate per hour from pre- and post-boil volumes.
   * Rate = (V_pre - V_post) / time
   */
  static calculateBoilOffRate(preVolume, postVolume, timeHours) {
    const vPre = parseFloat(preVolume) || 0;
    const vPost = parseFloat(postVolume) || 0;
    const hrs = parseFloat(timeHours) || 0;
    if (hrs <= 0 || vPre <= vPost) return 0;
    return Number(((vPre - vPost) / hrs).toFixed(2));
  }

  /**
   * Calculates post-boil specific gravity conserving total extract points.
   * Extract points = V_pre * (SG_pre - 1.0)
   * SG_post = 1.0 + (Extract points / V_post)
   */
  static calculatePostBoilGravity(preVolume, preGravity, postVolume) {
    const vPre = parseFloat(preVolume) || 0;
    const vPost = parseFloat(postVolume) || 0;
    // Work in gravity points (linear concentration), then convert back to SG.
    const extractPointsTotal = vPre * this.sgToPoints(preGravity);
    return vPost > 0 ? Number(this.pointsToSg(extractPointsTotal / vPost).toFixed(3)) : 1.050;
  }

  /**
   * Calculates packaged batch volume after thermal contraction and kettle loss.
   *
   * Physical ordering: the hot wort contracts first (hot -> cold), THEN the
   * unrecoverable kettle losses (trub + dead space) are racked off. Applying
   * shrinkage to the net volume would incorrectly shrink the losses too.
   *
   *   V_target = max(0, V_post * (1 - shrinkage) - Loss_kettle)
   *
   * @param {number} postVolume   - Hot post-boil volume (L).
   * @param {number} kettleLoss   - Sum of ALL post-boil additive losses (L):
   *                                trub_loss_l + kettle_dead_space_l +
   *                                kettle_transfer_loss_l. Compute this with
   *                                calculatePostBoilLoss(). See
   *                                plans/vessel-loss-model.md section 4.2.
   * @param {number} shrinkagePct - Thermal contraction fraction (e.g. 0.04).
   */
  static calculatePackagedVolume(postVolume, kettleLoss, shrinkagePct) {
    const vPost = parseFloat(postVolume) || 0;
    const loss = parseFloat(kettleLoss) || 0;
    const shrinkage = parseFloat(shrinkagePct) || 0.04;
    return Number(Math.max(0, (vPost * (1.0 - shrinkage)) - loss).toFixed(1));
  }

  /**
   * Calculates target original gravity in packaging vessel.
   * Target OG = 1.0 + (Extract points / V_target)
   */
  static calculateTargetOg(extractPointsTotal, targetVolume, fallbackOg = 1.050) {
    const points = parseFloat(extractPointsTotal) || 0;
    const vTarget = parseFloat(targetVolume) || 0;
    // extractPointsTotal is in gravity-point-liters (V * (SG - 1) * 1000),
    // so divide by (volume * 1000) to recover the SG offset.
    return vTarget > 0 ? Number((1.0 + (points / (vTarget * 1000))).toFixed(3)) : fallbackOg;
  }

  /**
   * Calculates the pre-boil (mash tun) additive loss scalar.
   *
   * Loss_preboil = mash_dead_space_l + mash_transfer_loss_l
   *
   * This loss is applied UPSTREAM of the boil solver: it determines what
   * pre-boil volume (V1) the brewer actually collects in the kettle. The
   * solver itself does not consume this value -- V1 is already defined as
   * post-lauter wort in the kettle, so subtracting this loss again would
   * double-count it. See plans/vessel-loss-model.md sections 4.1 and 5.2.
   */
  static calculatePreBoilLoss(mashDeadSpace, mashTransferLoss) {
    const deadSpace = parseFloat(mashDeadSpace) || 0;
    const transfer = parseFloat(mashTransferLoss) || 0;
    return Number((deadSpace + transfer).toFixed(2));
  }

  /**
   * Calculates the post-boil (boil kettle) additive loss scalar.
   *
   * Loss_postboil = trub_loss_l + kettle_dead_space_l + kettle_transfer_loss_l
   *
   * This loss is applied DOWNSTREAM of the boil solver, in the chilling
   * bridge that computes the packaged volume. It is passed as the
   * `kettleLoss` argument to calculatePackagedVolume(). See
   * plans/vessel-loss-model.md sections 4.2 and 5.2.
   */
  static calculatePostBoilLoss(trubLoss, kettleDeadSpace, kettleTransferLoss) {
    const trub = parseFloat(trubLoss) || 0;
    const deadSpace = parseFloat(kettleDeadSpace) || 0;
    const transfer = parseFloat(kettleTransferLoss) || 0;
    return Number((trub + deadSpace + transfer).toFixed(2));
  }

  /**
   * Calculates the HLT top-up volume required to keep the HERMS coil submerged
   * after strike water has been drawn from the HLT.
   *
   *   V_hlt_after_strike = hlt_starting_volume_l - strikeDrawn
   *   V_hlt_top_up       = max(0, hlt_coil_floor_l - V_hlt_after_strike)
   *
   * The coil floor is NOT a loss -- it is a minimum operating volume. This is
   * a derived, read-only value; it does not participate in the 2-DOF boil
   * solver. See plans/vessel-loss-model.md sections 4.3 and 4.4.
   *
   * @param {number} hltStartingVolume - Liquor in the HLT at brew-day start (L).
   * @param {number} strikeDrawn       - Strike water drawn from the HLT (L).
   * @param {number} coilFloor         - Minimum volume to submerge the coil (L).
   */
  static calculateHltTopUp(hltStartingVolume, strikeDrawn, coilFloor) {
    const starting = parseFloat(hltStartingVolume) || 0;
    const drawn = parseFloat(strikeDrawn) || 0;
    const floor = parseFloat(coilFloor) || 0;
    const afterStrike = starting - drawn;
    return Number(Math.max(0, floor - afterStrike).toFixed(2));
  }

  /**
   * Calculates the sparge water volume deliverable to the mash tun from the HLT.
   *
   *   V_sparge = V_hlt_after_strike
   *            + V_hlt_top_up
   *            - hlt_dead_space_l
   *            - hlt_transfer_loss_l
   *
   * The coil floor is NOT subtracted here: the top-up has already ensured the
   * coil is covered, so the floor volume is usable for sparging. HLT losses
   * are subtracted because that liquor cannot be delivered to the mash tun.
   * See plans/vessel-loss-model.md section 4.4.
   *
   * @param {number} hltStartingVolume - Liquor in the HLT at brew-day start (L).
   * @param {number} strikeDrawn       - Strike water drawn from the HLT (L).
   * @param {number} coilFloor         - Minimum volume to submerge the coil (L).
   * @param {number} hltDeadSpace      - Liquor trapped below the HLT drain (L).
   * @param {number} hltTransferLoss   - Liquor retained in HLT hose/pump (L).
   */
  static calculateSpargeVolume(hltStartingVolume, strikeDrawn, coilFloor, hltDeadSpace, hltTransferLoss) {
    const starting = parseFloat(hltStartingVolume) || 0;
    const drawn = parseFloat(strikeDrawn) || 0;
    const deadSpace = parseFloat(hltDeadSpace) || 0;
    const transfer = parseFloat(hltTransferLoss) || 0;
    const afterStrike = starting - drawn;
    const topUp = this.calculateHltTopUp(starting, drawn, coilFloor);
    return Number(Math.max(0, afterStrike + topUp - deadSpace - transfer).toFixed(2));
  }

  /**
   * Calculates the volume of HLT liquor that must be salted for the sparge.
   *
   *   V_sparge_salted = V_hlt_after_strike + V_hlt_top_up
   *
   * Critically, this INCLUDES the top-up. If the top-up is omitted from the
   * salt calculation, the sparge water's ion concentrations will be diluted
   * by the top-up factor and the wort will be under-mineralized. This is a
   * correctness requirement, not a convenience. See
   * plans/vessel-loss-model.md section 4.5.
   *
   * @param {number} hltStartingVolume - Liquor in the HLT at brew-day start (L).
   * @param {number} strikeDrawn       - Strike water drawn from the HLT (L).
   * @param {number} coilFloor         - Minimum volume to submerge the coil (L).
   */
  static calculateSpargeSaltVolume(hltStartingVolume, strikeDrawn, coilFloor) {
    const starting = parseFloat(hltStartingVolume) || 0;
    const drawn = parseFloat(strikeDrawn) || 0;
    const afterStrike = starting - drawn;
    const topUp = this.calculateHltTopUp(starting, drawn, coilFloor);
    return Number((afterStrike + topUp).toFixed(2));
  }

  /**
   * Converts specific gravity to gravity points (e.g. 1.055 -> 55.0).
   * Gravity points are the LINEAR concentration unit required by the
   * solute-conservation equation V1 * C1 = V2 * C2. SG itself is NOT linear
   * (it carries a +1.0 offset), so all extract math must go through here.
   */
  static sgToPoints(sg) {
    const value = parseFloat(sg);
    if (isNaN(value)) return 0;
    return (value - 1.0) * 1000;
  }

  /**
   * Converts gravity points back to specific gravity (e.g. 55.0 -> 1.055).
   * Exact inverse of sgToPoints().
   */
  static pointsToSg(points) {
    const value = parseFloat(points);
    if (isNaN(value)) return 1.0;
    return 1.0 + (value / 1000);
  }

  /**
   * Extracts gravity points from specific gravity (e.g. 1.055 -> 55.0).
   */
  static calculateOgPoints(og) {
    return Math.max(0, this.sgToPoints(og)).toFixed(1);
  }

  /**
   * Calculates total kettle extract points (volume * gravity points).
   */
  static calculateKettleExtract(volume, og) {
    const vol = parseFloat(volume) || 0;
    const points = Math.max(0, this.sgToPoints(og));
    return (vol * points).toFixed(1);
  }

  /**
   * Validates a requested 2-DOF output pair against the singular/degenerate blacklist.
   * Returns { valid: boolean, reason: string }.
   */
  static validateOutputPair(var1, var2) {
    const VALID_VARIABLES = new Set(BREW_CONSTANTS.SOLVER_VALID_VARIABLES);
    const INVALID_PAIRS = new Set(BREW_CONSTANTS.SOLVER_INVALID_PAIRS);

    if (!VALID_VARIABLES.has(var1) || !VALID_VARIABLES.has(var2)) {
      return { valid: false, reason: BREW_CONSTANTS.MSG_SOLVER_UNKNOWN_VARIABLE };
    }
    if (var1 === var2) {
      return { valid: false, reason: BREW_CONSTANTS.MSG_SOLVER_SAME_VARIABLE };
    }
    const key = [var1, var2].sort().join(':');
    if (INVALID_PAIRS.has(key)) {
      return { valid: false, reason: BREW_CONSTANTS.MSG_SOLVER_SINGULAR_PAIR };
    }
    return { valid: true, reason: 'Valid independent output pair.' };
  }

  /**
   * Generalized 2-DOF kettle solver.
   * Given a manifest and two output variable identifiers, solves for those two
   * while treating the remaining four as fixed inputs. Returns a result object
   * with the solved values and any validation error.
   */
  static solve2DOF(manifest, var1, var2) {
    const check = this.validateOutputPair(var1, var2);
    if (!check.valid) {
      return { ok: false, error: check.reason, solved: {} };
    }

    const m = manifest;
    const eq = m.equipment || {};
    const t = (parseFloat(m.boil_time_min) || 60) / 60.0;
    const V1 = parseFloat(m.preboil_volume_l) || 0;
    const V2 = parseFloat(m.postboil_volume_l) || 0;
    const R = parseFloat(eq.boil_off_rate_l_per_hr) || 0;

    // The solute-conservation equation V1 * C1 = V2 * C2 is only linear when
    // C is a LINEAR concentration -- i.e. gravity points (SG - 1) * 1000 --
    // NOT specific gravity itself (which carries a +1.0 offset). We therefore
    // convert SG -> gravity points on entry, solve in points, and convert
    // points -> SG on exit. The manifest continues to store SG (base unit).
    const G1 = this.sgToPoints(m.preboil_gravity);
    const G2 = this.sgToPoints(m.postboil_gravity);

    const pair = [var1, var2].sort().join(':');
    const solved = {};

    const fail = (msg) => ({ ok: false, error: msg, solved: {} });

    switch (pair) {
      // 1. (V2, G2) — Default / Option B
      case 'G2:V2': {
        if (R * t >= V1) return fail('Post-boil volume would be <= 0 (boil-off exceeds pre-boil volume).');
        solved.V2 = V1 - (R * t);
        solved.G2 = (V1 * G1) / solved.V2;
        break;
      }
      // 2. (R_boil, G2) — Option A
      case 'G2:R_boil': {
        if (t <= 0) return fail('Boil duration must be > 0.');
        if (V2 <= 0 || V1 <= V2) return fail('Pre-boil volume must exceed post-boil volume.');
        solved.R_boil = (V1 - V2) / t;
        solved.G2 = (V1 * G1) / V2;
        break;
      }
      // 3. (t, G2)
      case 'G2:t': {
        if (R <= 0) return fail('Boil-off rate must be > 0.');
        if (V2 <= 0 || V1 <= V2) return fail('Pre-boil volume must exceed post-boil volume.');
        solved.t = (V1 - V2) / R;
        solved.G2 = (V1 * G1) / V2;
        break;
      }
      // 4. (V1, G1) — Reverse Runoff Solver
      case 'G1:V1': {
        solved.V1 = V2 + (R * t);
        if (solved.V1 <= 0) return fail('Solved pre-boil volume must be > 0.');
        solved.G1 = (V2 * G2) / solved.V1;
        break;
      }
      // 5. (R_boil, G1)
      case 'G1:R_boil': {
        if (t <= 0) return fail('Boil duration must be > 0.');
        if (V1 <= 0 || V1 <= V2) return fail('Pre-boil volume must exceed post-boil volume.');
        solved.R_boil = (V1 - V2) / t;
        solved.G1 = (V2 * G2) / V1;
        break;
      }
      // 6. (t, G1)
      case 'G1:t': {
        if (R <= 0) return fail('Boil-off rate must be > 0.');
        if (V1 <= 0 || V1 <= V2) return fail('Pre-boil volume must exceed post-boil volume.');
        solved.t = (V1 - V2) / R;
        solved.G1 = (V2 * G2) / V1;
        break;
      }
      // 7. (V1, V2) — Dilution & Concentration
      case 'V1:V2': {
        if (G2 <= G1) return fail('Post-boil gravity must exceed pre-boil gravity (no boil concentration).');
        solved.V1 = (G2 * R * t) / (G2 - G1);
        solved.V2 = (G1 * R * t) / (G2 - G1);
        break;
      }
      // 8. (V1, R_boil)
      case 'R_boil:V1': {
        if (G1 <= 0) return fail('Pre-boil gravity must be > 0.');
        if (t <= 0) return fail('Boil duration must be > 0.');
        if (G1 >= G2) return fail('Post-boil gravity must exceed pre-boil gravity.');
        solved.V1 = (V2 * G2) / G1;
        solved.R_boil = (solved.V1 - V2) / t;
        break;
      }
      // 9. (V1, t)
      case 'V1:t': {
        if (G1 <= 0) return fail('Pre-boil gravity must be > 0.');
        if (R <= 0) return fail('Boil-off rate must be > 0.');
        if (G1 >= G2) return fail('Post-boil gravity must exceed pre-boil gravity.');
        solved.V1 = (V2 * G2) / G1;
        solved.t = (solved.V1 - V2) / R;
        break;
      }
      // 10. (V2, R_boil)
      case 'R_boil:V2': {
        if (G2 <= 0) return fail('Post-boil gravity must be > 0.');
        if (t <= 0) return fail('Boil duration must be > 0.');
        if (G1 >= G2) return fail('Post-boil gravity must exceed pre-boil gravity.');
        solved.V2 = (V1 * G1) / G2;
        solved.R_boil = (V1 - solved.V2) / t;
        break;
      }
      // 11. (V2, t)
      case 'V2:t': {
        if (G2 <= 0) return fail('Post-boil gravity must be > 0.');
        if (R <= 0) return fail('Boil-off rate must be > 0.');
        if (G1 >= G2) return fail('Post-boil gravity must exceed pre-boil gravity.');
        solved.V2 = (V1 * G1) / G2;
        solved.t = (V1 - solved.V2) / R;
        break;
      }
      // 12. (V1, G2)
      case 'G2:V1': {
        if (V2 <= 0) return fail('Post-boil volume must be > 0.');
        solved.V1 = V2 + (R * t);
        solved.G2 = (solved.V1 * G1) / V2;
        break;
      }
      // 13. (V2, G1)
      case 'G1:V2': {
        if (V1 <= 0) return fail('Pre-boil volume must be > 0.');
        if (V1 <= R * t) return fail('Boil-off exceeds pre-boil volume.');
        solved.V2 = V1 - (R * t);
        solved.G1 = (solved.V2 * G2) / V1;
        break;
      }
      default:
        return fail('Unsupported output pair.');
    }

    return { ok: true, error: null, solved };
  }

  /**
   * Executes complete boil thermodynamics solver across Option A or Option B.
   */
  static solveBoil(manifest) {
    const m = manifest;
    const eq = m.equipment || {};
    const boilTimeHrs = (parseFloat(m.boil_time_min) || 60) / 60.0;
    const totalKettleLoss = this.calculatePostBoilLoss(
      eq.trub_loss_l,
      eq.kettle_dead_space_l,
      eq.kettle_transfer_loss_l
    );
    const shrinkage = parseFloat(eq.shrinkage_pct) || 0.04;
    const vPre = parseFloat(m.preboil_volume_l) || 26.0;
    const sgPre = parseFloat(m.preboil_gravity) || 1.045;

    if (m.boil_solver_mode === 'option_a') {
      const vPost = parseFloat(m.postboil_volume_l) || 22.5;
      const solvedRate = this.calculateBoilOffRate(vPre, vPost, boilTimeHrs);
      if (solvedRate > 0) {
        eq.boil_off_rate_l_per_hr = solvedRate;
      }
      const sgPost = this.calculatePostBoilGravity(vPre, sgPre, vPost);
      m.postboil_gravity = sgPost;

      const vTarget = this.calculatePackagedVolume(vPost, totalKettleLoss, shrinkage);
      m.target_volume_l = vTarget;

      const extractPointsTotal = vPre * (sgPre - 1.0);
      m.target_og = this.calculateTargetOg(extractPointsTotal, vTarget, sgPost);
    } else {
      const rate = parseFloat(eq.boil_off_rate_l_per_hr) || 3.5;
      const vPost = Number(this.calculatePostBoil(vPre, rate, boilTimeHrs).toFixed(1));
      m.postboil_volume_l = vPost;

      const sgPost = this.calculatePostBoilGravity(vPre, sgPre, vPost);
      m.postboil_gravity = sgPost;

      const vTarget = this.calculatePackagedVolume(vPost, totalKettleLoss, shrinkage);
      m.target_volume_l = vTarget;

      const extractPointsTotal = vPre * (sgPre - 1.0);
      m.target_og = this.calculateTargetOg(extractPointsTotal, vTarget, sgPost);
    }

    return m;
  }
}

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
      this.highWaterMark = Math.max(this.highWaterMark, stepNumber + 1);
      this.activeStep = stepNumber + 1;
      Alpine.store('ui').add(BREW_CONSTANTS.MSG_STEP_CONFIGURED_TEMPLATE(stepNumber), 'success');
    },

    invalidateDownstream(fromStepNumber) {
      this.dirtySteps = [6, 7, 8, 9, 11, 12].filter(step => step > fromStepNumber);
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
        max_kettle_volume_l: 38.0,
        max_mash_tun_volume_l: 38.0,
        max_hlt_volume_l: 38.0,
        mash_dead_space_l: 0.946,          // 0.25 gal false-bottom loss
        mash_transfer_loss_l: 0.946,       // 0.25 gal hose/pump loss
        kettle_dead_space_l: 1.249,        // 0.33 gal unrecoverable kettle wort
        kettle_transfer_loss_l: 0.946,     // 0.25 gal hose/pump loss
        hlt_dead_space_l: 0.946,           // 0.25 gal hose/pump loss
        hlt_transfer_loss_l: 0.946,        // 0.25 gal hose/pump loss
        trub_loss_l: 2.0,
        boil_off_rate_l_per_hr: 3.5,
        grain_absorption_factor_l_per_kg: 0.96,
        conversion_efficiency: 0.90,
        shrinkage_pct: 0.04,
        hlt_coil_floor_l: 12.0,
        hlt_starting_volume_l: 38.0,
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
      // Event bus listener for recipe recalculation & step invalidation
      window.addEventListener('recipe:recalculate', () => {
        this.runBoilSolver();
      });
      window.addEventListener('wizard:invalidate', (e) => {
        if (e.detail && e.detail.step) {
          this.invalidateDownstream(e.detail.step);
        }
      });

      // Auto-load matching preset once equipment profiles are available
      this.$watch('$store.equipment.profiles', (profiles) => {
        if (profiles && profiles.length > 0 && !this.manifest.equipment_profile_id) {
          this.selectProfile(profiles[0].id);
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

      // Validate Step 2
      if (stepNumber === 2) {
        if (!this.manifest.name || this.manifest.name.trim() === '') {
          Alpine.store('ui').add(BREW_CONSTANTS.MSG_BATCH_NAME_REQUIRED, 'error');
          return;
        }
        if (!this.manifest.target_volume_l || this.manifest.target_volume_l <= 0) {
          Alpine.store('ui').add(BREW_CONSTANTS.MSG_TARGET_VOLUME_REQUIRED, 'error');
          return;
        }
        if (!this.manifest.target_og || this.manifest.target_og < 1.010 || this.manifest.target_og > 1.200) {
          Alpine.store('ui').add(BREW_CONSTANTS.MSG_TARGET_OG_REQUIRED, 'error');
          return;
        }
      }

      nav.markStepComplete.call(this, stepNumber);
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
