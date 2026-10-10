/**
 * Global Catalog Store for Fermentables (Malts & Sugars) and Yeasts.
 */

import { apiFetch } from '../api/firebase.js';

export default {
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
};
