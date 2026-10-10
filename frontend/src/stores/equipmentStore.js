/**
 * Global Equipment Profiles Store.
 */

import Alpine from 'alpinejs';
import { apiFetch } from '../api/firebase.js';
import { BREW_CONSTANTS } from '../../constants.js';

export default {
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
};
