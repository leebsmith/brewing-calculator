/**
 * Two-Tier Grist Grain Bill & Hamilton Proportional Allocation Engine.
 */

import Alpine from 'alpinejs';
import { BREW_CONSTANTS } from '../../constants.js';
import {
  grainYieldToImperialGallonPointsPerPound,
  calculateMetricLiterDegreesPerKg,
  isTracePercentage,
  allocateProportionalPercentages,
} from '../utils/pureFunctions.js';

export default {
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
      color_lovibond: 1.8,
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
    const weightedSum = rows.reduce((sum, r) => sum + ((r.pct || 0) * (parseFloat(r.color_lovibond) || 0)), 0);
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
    return unitsStore ? unitsStore.getFieldUnit('color') : 'Lovibond';
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
    const lovibond = parseFloat(row.color_lovibond) || 0;
    const unitsStore = Alpine.store('units');
    return unitsStore ? unitsStore.toDisplay('color', lovibond) : Number(lovibond.toFixed(1));
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
      color_lovibond: catalogItem.color_lovibond || 2.0,
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
};
