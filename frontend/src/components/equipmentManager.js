/**
 * Isolated Equipment Manager
 * Manages profile drawer CRUD, preset loading, and equipment change event dispatching.
 */

import Alpine from 'alpinejs';
import { BREW_CONSTANTS } from '../../constants.js';

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
        };
        // hlt_starting_volume_l is batch-level, not equipment-level. Pre-fill
        // it from the profile's max_hlt_volume_l (fill-to-capacity default)
        // so the Step 5 input tracks the selected equipment.
        this.manifest.hlt_starting_volume_l = preset.max_hlt_volume_l;
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
        Number(eq.hlt_coil_floor_l) !== Number(preset.hlt_coil_floor_l)
      );
    }
  };
}
