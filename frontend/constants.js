/**
 * Centralized physical constants, default equipment profile parameters, and UI domain strings
 * for the brewing calculator frontend.
 */

export const BREW_CONSTANTS = {
  // Physical & Equipment Defaults
  DEFAULT_CONVERSION_EFFICIENCY: 0.90,
  DEFAULT_GRAIN_ABSORPTION_L_PER_KG: 0.96,
  DEFAULT_SHRINKAGE_PCT: 0.04,
  DEFAULT_MASH_DEAD_SPACE_L: 0.946,          // 0.25 gal false-bottom loss
  DEFAULT_MASH_TRANSFER_LOSS_L: 0.946,       // 0.25 gal hose/pump loss
  DEFAULT_KETTLE_DEAD_SPACE_L: 1.249,        // 0.33 gal unrecoverable kettle wort
  DEFAULT_KETTLE_TRANSFER_LOSS_L: 0.946,     // 0.25 gal hose/pump loss
  DEFAULT_TRUB_LOSS_L: 1.5,
  DEFAULT_HLT_DEAD_SPACE_L: 0.946,           // 0.25 gal hose/pump loss
  DEFAULT_HLT_TRANSFER_LOSS_L: 0.946,        // 0.25 gal hose/pump loss
  DEFAULT_BOIL_OFF_RATE_L_PER_HR: 3.0,
  DEFAULT_MAX_KETTLE_VOLUME_L: 35.0,
  DEFAULT_MAX_MASH_TUN_VOLUME_L: 35.0,
  DEFAULT_MAX_HLT_VOLUME_L: 35.0,
  DEFAULT_HLT_COIL_FLOOR_L: 0.0,
  DEFAULT_HLT_STARTING_VOLUME_L: 35.0,

  // Wizard Step Roster
  // Single source of truth for which steps are implemented. Update this list
  // when adding a new step partial, and update invalidateDownstream's
  // downstream set accordingly. Steps are 1-indexed and MUST be contiguous:
  // markStepComplete(N) advances to N+1, so a gap would strand the wizard on
  // a step with no matching #step-panel-N.
  WIZARD_STEPS: [1, 2, 3, 4, 5],

  // Steps that become dirty when an upstream step changes. These are the
  // solved/derived steps (Master Solver, Water Chemistry, Hops, Fermentation,
  // Dry Hops, Ledger). Kept separate from WIZARD_STEPS because a step can be
  // implemented but not yet downstream-invalidatable (e.g. a pure input step).
  WIZARD_DOWNSTREAM_STEPS: [6, 7, 8, 9, 10, 11],

  // Grist Bill Limits
  MAX_MAJOR_MALTS: 8,

  // Yeast Selection Limits
  MAX_VISIBLE_YEASTS: 25,

  // Default Batch Manifest Settings
  DEFAULT_BATCH_NAME: 'Untitled Batch',
  DEFAULT_EQUIPMENT_PROFILE_ID: 'herms-30l',
  DEFAULT_V_FERM_L: 20.0,
  DEFAULT_TARGET_ABV: 5.5,
  DEFAULT_TARGET_OG: 1.055,
  DEFAULT_BOIL_TIME_MIN: 60,

  // Mash Card defaults (design record Q3, Q10)
  // Grain temperature is batch-specific and user-editable; it is NOT sourced
  // from the equipment profile. Default on first entry is 20.0 °C.
  DEFAULT_GRAIN_TEMP_C: 20.0,

  // Default mash thickness (L/kg), used by the Mash Card's strike-water-temp
  // derivation until the solver writes manifest.mash_thickness_l_per_kg.
  // 1.25 qt/lb = 2.6079 L/kg (design record Q3).
  DEFAULT_MASH_THICKNESS_L_PER_KG: 2.6079,

  // Default mash thickness (L/kg), used by the Mash Card's strike-water-temp
  // derivation until the solver writes manifest.mash_thickness_l_per_kg.
  // 1.25 qt/lb = 2.6079 L/kg (design record Q3).
  DEFAULT_MASH_THICKNESS_L_PER_KG: 2.6079,

  // Extract Potential Reference Constants (Pure Sucrose / Grist Scaling)
  SUCROSE_POTENTIAL_PPG: 46.21,
  IMPERIAL_POTENTIAL_SCALING_FACTOR: 46.21,
  METRIC_POTENTIAL_SCALING_FACTOR: 386.4,
  LDK_PPG_CONVERSION_FACTOR: 8.345,

  // Drawer / Custom Profile Defaults
  DEFAULT_CUSTOM_PROFILE_NAME: 'My Custom Profile',

  // Emulator Ports & URLs
  AUTH_EMULATOR_PORT: 9099,
  BACKEND_API_URL: 'http://localhost:8000',

  // Unit System Constants & Registry
  STORAGE_KEY_UNIT_PREFERENCES: 'brew_unit_preferences',

  UNIT_MODES: {
    METRIC: 0,
    IMPERIAL: 1
  },

  DOMAIN_BINARY_PAIRS: {
    volume: ['L', 'gal'],
    mass: ['kg', 'lb'],
    hopMass: ['g', 'oz'],
    temperature: ['C', 'F'],
    gravity: ['Plato', 'SG'],
    compound: ['L/kg', 'qt/lb'],
    // Mash thickness is a volume-per-mass ratio (L/kg <-> qt/lb). It is a
    // distinct domain from `compound` because the Mash Card's mash-thickness
    // field is a separate user preference from the Step 5 intensive value,
    // even though the conversion pair is numerically identical.
    mash_thickness: ['L/kg', 'qt/lb'],
    extract_potential: ['L·°/kg', 'gal·°/lb'],
    total_extract: ['L·°', 'gal·pts'],
    // Color is stored as Lovibond (the unit used by malts.json and
    // MaltPrimitive.color_lovibond). The EBC factor below is the legacy
    // SRM->EBC factor (1.97) reinterpreted as Lovibond->EBC; it is an
    // approximation, not a definition. See UNIT_REGISTRY.color in script.js.
    color: ['EBC', 'Lovibond'],
    percentage: ['%', 'fraction']
  },

  FIELD_REGISTRY: {
    // Step 1: Equipment Profile
    'step1_max_kettle_volume_l': 'volume',
    'step1_max_mash_tun_volume_l': 'volume',
    'step1_max_hlt_volume_l': 'volume',
    'step1_hlt_coil_floor_l': 'volume',
    'step1_mash_dead_space_l': 'volume',
    'step1_mash_transfer_loss_l': 'volume',
    'step1_kettle_dead_space_l': 'volume',
    'step1_kettle_transfer_loss_l': 'volume',
    'step1_hlt_dead_space_l': 'volume',
    'step1_hlt_transfer_loss_l': 'volume',
    'step1_trub_loss_l': 'volume',
    'step1_boil_off_rate_l_per_hr': 'volume',
    'step1_grain_absorption': 'compound',
    'step1_conversion_efficiency': 'percentage',
    'step1_shrinkage_pct': 'percentage',
    // Step 2: Yeast Selection
    'step2_yeast_attenuation_pct': 'percentage',
    // Step 4: Batch Sparge Solver
    'step4_v_ferm': 'volume',
    'step4_intensive_value': 'compound',
    'step4_v_post_boil': 'volume',
    'step4_sg_post_boil': 'gravity',
    'step4_v_pre_boil': 'volume',
    'step4_s_post_boil_target': 'mass',
    'step4_m_grist': 'mass',
    'step4_v_strike': 'volume',
    'step4_v_run1': 'volume',
    'step4_v_run2': 'volume',
    'step4_v_sparge': 'volume',
    'step4_s_run1': 'mass',
    'step4_s_run2': 'mass',
    'step4_sg_pre_boil': 'gravity',
    // HLT water budget (batch-level input + derived outputs)
    'step4_hlt_starting_volume_l': 'volume',
    'step4_v_hlt_top_up': 'volume',
    'step4_v_sparge_deliverable': 'volume',
    // Step 5: Mash Card
    'step5_grain_temp_c': 'temperature',
    'step5_strike_water_temp_c': 'temperature',
    'step5_mash_thickness': 'mash_thickness',
    'step5_rest_use_temp_c': 'temperature',
    'step5_mash_out_temp_c': 'temperature',
    // Limit of Attenuation readout. A dedicated key (rather than reusing
    // step2_yeast_attenuation_pct) so the LOA display unit is independent of
    // the yeast attenuation unit preference.
    'step5_loa': 'percentage'
  },

  UNIT_DOMAIN_MASS: 'mass',
  UNIT_DOMAIN_VOLUME: 'volume',
  UNIT_DOMAIN_HOP_MASS: 'hopMass',
  UNIT_DOMAIN_TEMPERATURE: 'temperature',
  UNIT_DOMAIN_GRAVITY: 'gravity',
  UNIT_DOMAIN_PERCENTAGE: 'percentage',
  UNIT_DOMAIN_COMPOUND: 'compound',
  UNIT_DOMAIN_MASH_THICKNESS: 'mash_thickness',
  UNIT_DOMAIN_EXTRACT_POTENTIAL: 'extract_potential',
  UNIT_DOMAIN_TOTAL_EXTRACT: 'total_extract',

  // UI Messages & Labels
  MSG_KETTLE_VOLUME_REQUIRED: 'Maximum kettle volume must be greater than zero.',
  MSG_BOIL_OFF_REQUIRED: 'Boil-off rate must be greater than zero.',
  MSG_PROFILE_NAME_REQUIRED: 'Profile name is required.',
  MSG_YEAST_REQUIRED: 'Please select a yeast strain.',
  MSG_YEAST_ATTENUATION_RANGE: (low, high) => `Attenuation must be between ${(low * 100).toFixed(1)}% and ${(high * 100).toFixed(1)}%.`,
  MSG_STEP_CONFIGURED_TEMPLATE: (stepNum) => `Step ${stepNum} configured.`,
  MSG_PROFILE_SAVED: 'Equipment profile saved successfully.',
  // Updated MSG_PROFILE_DELETED to avoid conflict with the string literal from report
  MSG_EQUIPMENT_PROFILE_DELETED: 'Equipment profile deleted.',
  MSG_CANNOT_DELETE_PRESET: 'Cannot delete built-in canonical equipment preset.',

  // New constants for Anomaly 7
  MSG_UNIT_PREFERENCES_LOAD_FAILED: 'Failed to load unit preferences',
  MSG_PING_PROCESSED_SUCCESSFULLY: 'Ping processed successfully!',

  // Batch Sparge Solver (POST /api/solve-batch)
  MSG_BATCH_SOLVER_FAILED: 'Batch solver request failed.',
  MSG_BATCH_SOLVER_NO_GRIST: 'Add at least one major malt before solving the batch.',

  // User-facing messages for solver validation failures. Keyed by the
  // SolverValidationError.code returned in the 422 detail payload. The raw
  // backend message is logged to the console for debugging; these strings are
  // what the user sees inline.
  MSG_SOLVER_ERRORS: {
    INVALID_TARGET_ABV: 'Target ABV must be greater than zero.',
    INVALID_ATTENUATION: 'Yeast attenuation must be between 0% and 100%.',
    ABV_UNREACHABLE: 'That ABV is too high for the selected yeast. Lower the target or pick a more attenuative strain.',
    INVALID_FERM_VOLUME: 'Target fermenter volume must be greater than zero.',
    INVALID_SHRINKAGE: 'Cooling shrinkage must be between 0% and 100%.',
    EXTRACT_TARGET_NON_POSITIVE: 'The grain bill is too small for this batch. Add more malt or lower the target ABV.',
    INVALID_EXTRACT_POTENTIAL: 'One or more malts have an invalid extract potential. Check the grain bill.',
    DEGENERATE_BRACKET: 'The solver could not find a valid grain bill for these inputs. Check the equipment profile and grain bill.',
    BRACKET_NO_SIGN_CHANGE: 'No grain bill can satisfy these targets. Try lowering the ABV, increasing the batch volume, or adding more malt.',
    UNKNOWN_TOPOLOGY: 'Internal error: unknown constraint topology.',
    INVALID_INTENSIVE_VALUE: 'The mash thickness or runoff ratio must be greater than zero.',
    MASH_TOO_THIN: 'The mash is too thin for this grain bill. Increase the mash thickness (L/kg) or reduce the batch size.',
    HLT_TOO_SMALL: 'The HLT is too small to cover the coil and deliver the sparge. Use a larger HLT or reduce the batch size.',
  },
};
