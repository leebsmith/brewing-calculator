/**
 * Centralized physical constants, default equipment profile parameters, and UI domain strings
 * for the brewing calculator frontend.
 */

export const BREW_CONSTANTS = {
  // Physical & Equipment Defaults
  DEFAULT_CONVERSION_EFFICIENCY: 0.90,
  DEFAULT_GRAIN_ABSORPTION_L_PER_KG: 0.96,
  DEFAULT_SHRINKAGE_PCT: 0.04,
  DEFAULT_MASH_DEAD_SPACE_L: 0.0,
  DEFAULT_TRUB_LOSS_L: 1.5,
  DEFAULT_BOIL_OFF_RATE_L_PER_HR: 3.0,
  DEFAULT_MAX_KETTLE_VOLUME_L: 35.0,
  DEFAULT_MAX_MASH_TUN_VOLUME_L: 35.0,
  DEFAULT_MAX_HLT_VOLUME_L: 35.0,
  DEFAULT_HLT_MIN_VOLUME_L: 0.0,

  // Default Batch Manifest Settings
  DEFAULT_BATCH_NAME: 'Untitled Batch',
  DEFAULT_EQUIPMENT_PROFILE_ID: 'herms-30l',
  DEFAULT_TARGET_VOLUME_L: 20.0,
  DEFAULT_TARGET_OG: 1.055,
  DEFAULT_BOIL_TIME_MIN: 60,

  // Extract Potential Reference Constants (Pure Sucrose / Grist Scaling)
  SUCROSE_POTENTIAL_PPG: 46.21,
  METRIC_POTENTIAL_SCALING_FACTOR: 386.4,

  // Drawer / Custom Profile Defaults
  DEFAULT_CUSTOM_PROFILE_NAME: 'My Custom Profile',

  // Unit System Constants & Presets
  UNIT_PRESET_METRIC: 'metric',
  UNIT_PRESET_IMPERIAL: 'imperial',
  UNIT_PRESET_CUSTOM: 'custom',
  STORAGE_KEY_UNIT_PREFERENCES: 'brew_unit_preferences',

  UNIT_DOMAIN_MASS: 'mass',
  UNIT_DOMAIN_VOLUME: 'volume',
  UNIT_DOMAIN_HOP_MASS: 'hopMass',
  UNIT_DOMAIN_TEMPERATURE: 'temperature',
  UNIT_DOMAIN_GRAVITY: 'gravity',
  UNIT_DOMAIN_PERCENTAGE: 'percentage',
  UNIT_DOMAIN_COMPOUND: 'compound',
  UNIT_DOMAIN_EXTRACT_POTENTIAL: 'extract_potential',

  // UI Messages & Labels
  MSG_KETTLE_VOLUME_REQUIRED: 'Maximum kettle volume must be greater than zero.',
  MSG_BOIL_OFF_REQUIRED: 'Boil-off rate must be greater than zero.',
  MSG_BATCH_NAME_REQUIRED: 'Batch name is required.',
  MSG_TARGET_VOLUME_REQUIRED: 'Target packaged volume must be greater than zero.',
  MSG_TARGET_OG_REQUIRED: 'Target original gravity must be between 1.010 and 1.200.',
  MSG_PROFILE_NAME_REQUIRED: 'Profile name is required.',
  MSG_STEP_CONFIGURED_TEMPLATE: (stepNum) => `Step ${stepNum} configured.`,
  MSG_PROFILE_SAVED: 'Equipment profile saved successfully.',
  // Updated MSG_PROFILE_DELETED to avoid conflict with the string literal from report
  MSG_EQUIPMENT_PROFILE_DELETED: 'Equipment profile deleted.',
  MSG_CANNOT_DELETE_PRESET: 'Cannot delete built-in canonical equipment preset.',

  // New constants for Anomaly 7
  MSG_UNIT_PREFERENCES_LOAD_FAILED: 'Failed to load unit preferences',
  MSG_PING_PROCESSED_SUCCESSFULLY: 'Ping processed successfully!',
};
