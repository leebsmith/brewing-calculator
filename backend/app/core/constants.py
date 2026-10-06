"""
Centralized physical constants, default equipment profile parameters, and domain strings
for the brewing calculator backend.
"""

from typing import Final

# Default Equipment Profile Defaults & Physical Constants
DEFAULT_CONVERSION_EFFICIENCY: Final[float] = 0.90
DEFAULT_GRAIN_ABSORPTION_L_PER_KG: Final[float] = 0.96
DEFAULT_SHRINKAGE_PCT: Final[float] = 0.04
DEFAULT_MASH_DEAD_SPACE_L: Final[float] = 0.0
DEFAULT_KETTLE_DEAD_SPACE_L: Final[float] = 0.0
DEFAULT_TRUB_LOSS_L: Final[float] = 1.5
DEFAULT_BOIL_OFF_RATE_L_PER_HR: Final[float] = 3.0
DEFAULT_MAX_KETTLE_VOLUME_L: Final[float] = 35.0
DEFAULT_MAX_MASH_TUN_VOLUME_L: Final[float] = 35.0
DEFAULT_MAX_HLT_VOLUME_L: Final[float] = 35.0
DEFAULT_HLT_MIN_VOLUME_L: Final[float] = 0.0

# Canonical Preset IDs & Names
PRESET_ID_HERMS_30L: Final[str] = "herms-30l"
PRESET_NAME_HERMS_30L: Final[str] = "30L 3-Vessel HERMS"

PRESET_ID_HERMS_50L: Final[str] = "herms-50l"
PRESET_NAME_HERMS_50L: Final[str] = "50L 3-Vessel HERMS"

PRESET_ID_BIAB_35L: Final[str] = "biab-35l"
PRESET_NAME_BIAB_35L: Final[str] = "35L All-In-One Electric BIAB"

PRESET_ID_COOLER_20L: Final[str] = "cooler-mash-20l"
PRESET_NAME_COOLER_20L: Final[str] = "20L Stovetop / Cooler Mash"

# Error Messages & Domain Strings
ERR_KETTLE_VOLUME_REQUIRED: Final[str] = "Maximum kettle volume must be greater than zero."
ERR_BOIL_OFF_REQUIRED: Final[str] = "Boil-off rate must be greater than zero."
ERR_PROFILE_NOT_FOUND: Final[str] = "Equipment profile not found."
ERR_CANNOT_DELETE_PRESET: Final[str] = "Cannot delete built-in canonical equipment preset."
