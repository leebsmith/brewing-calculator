# Implementation Plan: Overwrite All Unit Preference Persistence & Modal Warning

## Objective
Update the custom unit override modal and persistence logic so that when a user selects **"Apply to All Fields"** (Overwrite All):
1. An explicit warning ("Warning: Previous custom overrides will be permanently lost.") is displayed in the modal button subtext.
2. All granular field customizations (`fieldPreferences`) are completely purged from `localStorage` and state.
3. The selected global unit preset (`activePreset` and global `preferences`) is explicitly persisted to `localStorage`.

---

## Key Files & Context
* **`frontend/script.js`**: Contains `applyPreset(presetName, overwriteAll)` and `saveToStorage()`.
* **`frontend/index.html`**: Contains the Option C Custom Override Prompt Modal markup.

---

## Implementation Steps

### Step 1: Update Modal Button Copy in `frontend/index.html`
Modify the description for the "Apply to All Fields" button in the Option C modal to include the explicit data-loss warning:
* **Current:** `Overwrites all custom unit choices with preset defaults.`
* **Proposed:** `Overwrites all custom unit choices with preset defaults. Warning: Previous custom overrides will be permanently lost.`

### Step 2: Verify & Refine `applyPreset` Logic in `frontend/script.js`
Ensure `applyPreset(presetName, true)` correctly resets `this.fieldPreferences = {}` and saves the updated clean state (preserving `activePreset` and global `preferences` while purging stale field overrides) to `localStorage`.

---

## Verification & Testing
1. Configure custom field overrides in the UI (e.g. click a unit badge on an equipment profile field).
2. Switch to a different global preset (e.g., toggle between Metric and Imperial).
3. Verify that the warning modal appears with the updated text.
4. Click **"Apply to All Fields"**.
5. Inspect browser `localStorage` (`brewing_calc_units`) to verify:
   * `activePreset` is updated to the new preset.
   * `fieldPreferences` is an empty object (`{}`).
6. Refresh the page and confirm the application starts in the expected preset mode without residual custom field overrides.
