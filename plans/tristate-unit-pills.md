# Implementation Plan: Tri-State Unit Pill Selector (Pure CSS)

## Objective
Replace the existing segmented unit selector buttons in `frontend/index.html` with two side-by-side pure CSS pill buttons (`[ Metric ]` and `[ Imperial ]`) that dynamically reflect **Pure (Solid)**, **Mixed (Tinted)**, and **Inactive (Ghost)** states based on active preset and custom field overrides.

---

## Key Files & Context
* **`frontend/style.css`**: Add CSS rules for `.unit-pill-group`, `.unit-pill`, `.unit-pill-metric` / `.unit-pill-imperial` across solid, tinted, and ghost variants using CSS design tokens (`tokens.css`).
* **`frontend/index.html`**: Replace the old header unit selector markup with the two dynamic pill buttons using Alpine `:class` bindings and `aria-pressed`.
* **`frontend/script.js`**: Verify helper getters (if needed) for determining if a specific preset is in a "pure" vs "tinted" state.

---

## Detailed State Logic & Styling Matrix

1. **Pure State (Solid Fill):**
   * Condition: `activePreset === presetName` AND no custom overrides exist (`!hasCustomOverrides`).
   * Visual: Solid primary/accent background (`var(--color-primary-600)`), high-contrast text (`#fff`), subtle shadow.

2. **Mixed State (Tinted / Semi-Transparent Fill):**
   * Condition: `activePreset === presetName` AND custom overrides exist (`hasCustomOverrides`).
   * Visual: Semi-transparent background fill (`rgba(...)` or CSS variable equivalent with opacity), accent border and text.

3. **Ghost State (Inactive):**
   * Condition: `activePreset !== presetName` (and not matching the active baseline).
   * Visual: Transparent/ghost background, muted text and border (`var(--color-slate-200)` / `var(--color-slate-600)`).

---

## Implementation Steps

### Step 1: Add CSS Rules in `frontend/style.css`
Create modular CSS classes for the unit pill container and state variants:
* `.unit-pill-group`: Flex container with gap, border, padding, and rounded corners.
* `.unit-pill`: Base button styling (font-weight, transition, padding, rounded).
* `.unit-pill-solid`: Solid active state.
* `.unit-pill-tinted`: Mixed/custom active state.
* `.unit-pill-ghost`: Inactive ghost state.

### Step 2: Update Markup in `frontend/index.html`
Replace the header unit selector block with:
```html
<div class="unit-pill-group">
  <button
    type="button"
    @click="$store.units.setPreset(BREW_CONSTANTS.UNIT_PRESET_METRIC)"
    class="unit-pill"
    :class="{
      'unit-pill-solid': $store.units.activePreset === 'metric' && !Object.values($store.units.preferences).some(p => p.is_customized) && Object.keys($store.units.fieldPreferences).length === 0,
      'unit-pill-tinted': $store.units.activePreset === 'metric' && (Object.values($store.units.preferences).some(p => p.is_customized) || Object.keys($store.units.fieldPreferences).length > 0),
      'unit-pill-ghost': $store.units.activePreset !== 'metric'
    }"
    :aria-pressed="$store.units.activePreset === 'metric'"
  >
    Metric (L)
  </button>
  <button
    type="button"
    @click="$store.units.setPreset(BREW_CONSTANTS.UNIT_PRESET_IMPERIAL)"
    class="unit-pill"
    :class="{
      'unit-pill-solid': $store.units.activePreset === 'imperial' && !Object.values($store.units.preferences).some(p => p.is_customized) && Object.keys($store.units.fieldPreferences).length === 0,
      'unit-pill-tinted': $store.units.activePreset === 'imperial' && (Object.values($store.units.preferences).some(p => p.is_customized) || Object.keys($store.units.fieldPreferences).length > 0),
      'unit-pill-ghost': $store.units.activePreset !== 'imperial'
    }"
    :aria-pressed="$store.units.activePreset === 'imperial'"
  >
    Imperial (gal)
  </button>
</div>
```

### Step 3: Verification & Testing
1. Load application and verify default metric state (Metric is solid, Imperial is ghost).
2. Switch to Imperial and verify Imperial becomes solid, Metric becomes ghost.
3. Customize an individual field (e.g. kettle volume unit badge).
4. Verify the active pill shifts from solid to tinted (mixed state).
5. Click the active tinted pill, trigger the prompt modal, and verify overwrite/keep behavior correctly restores solid or ghost states.
