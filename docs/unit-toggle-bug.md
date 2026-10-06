# Unit Toggle Bug Analysis: Volume Field

## Problem Statement

The unit toggling functionality for volume fields (e.g., "Max Kettle Volume") exhibits an asymmetric behavior and fails to cycle indefinitely when the global unit preset is set to Imperial. After a certain point in the toggle sequence, the unit stops changing, breaking the expected user interaction.

## Evidence

The following observations and console log outputs from `frontend/script.js` provide evidence for the problem:

### 1. Unexpected `activePreset` State Corruption
- **Observation:** After the initial unit toggle, the `activePreset` variable within the `units` store is consistently logged as `'custom'`, irrespective of the initial preset ('metric' or 'imperial').
- **Relevant Log Snippet:**
  ```
  script.js:744 Final activePreset after toggleField: custom
  ```
- **Implication:** This permanently alters the expected preset state, preventing subsequent logic from correctly referencing 'metric' or 'imperial' defaults.

### 2. Flawed `defaultUnit` Calculation with `activePreset = 'custom'`
- **Observation:** When `activePreset` is 'custom', the `defaultUnit` for volume is logged as 'gal', contradicting the code's structure which implies 'L' for non-'imperial' presets.
- **Relevant Log Snippet:**
  ```
  script.js:670 Calculated defaultUnit for volume: gal
  ```
- **Implication:** An incorrect default unit is used for comparisons, directly impacting the `isCustom` flag calculation.

### 3. Incorrect `isCustom` Flag Calculation
- **Observation:** In critical toggle steps (e.g., Toggle 3 in Imperial mode), the `isCustom` flag is logged as `false` even when the `next` unit ('L') is different from the `defaultUnit` ('gal').
- **Relevant Log Snippet:**
  ```
  script.js:674 Calculated isCustom flag: false
  ```
- **Implication:** This false `isCustom` value causes the logic to incorrectly delete `fieldPreferences` instead of setting a custom state, thus breaking the cycle and stopping the unit from changing further.

### 4. Observed Cycle and Stop Point
- **Imperial Mode Trace (from logs):
    1. `gal` (default Imperial) -> `L*` (custom metric)
    2. `L*` (custom metric) -> `gal` (default Imperial, custom deleted)
    3. `gal` (default Imperial) -> `L*` (custom metric, but `isCustom` calculated incorrectly as false, leading to delete) -> **Cycle Break**
- **Conclusion:** The failure occurs when returning to a default unit state (e.g., 'gal' in Imperial mode) where the subsequent logic cannot correctly identify the next unit ('L') as custom.

## Theoretical Code Modification

The bug originates from the line `this.activePreset = 'custom';` within the `toggleField` function and the subsequent flawed logic for `defaultUnit` and `isCustom` calculation when `activePreset` is 'custom'.

The theoretical fix would involve addressing these points:

### 1. Correct `activePreset` Handling:
*   **Issue:** `this.activePreset = 'custom';` prematurely and permanently changes the `activePreset` state.
*   **Proposed Change:** Remove or conditionally execute `this.activePreset = 'custom';`. The `activePreset` should ideally be managed by `setPreset` and `applyPreset`, and `toggleField` should use the *correct* `activePreset` ('metric' or 'imperial') for its calculations.

### 2. Fix `defaultUnit` Calculation for 'custom' `activePreset`:
*   **Issue:** When `activePreset` is 'custom', the `defaultUnit` for volume appears to default incorrectly to 'gal' instead of 'L' (as implied by the code's structure).
*   **Proposed Change:** Ensure the `defaultUnit` calculation correctly respects the intended default for volume units ('L' for non-imperial, 'gal' for imperial) regardless of whether `activePreset` is 'metric', 'imperial', or potentially a correctly handled 'custom' state. If a 'custom' preset is intended, its default unit should be explicitly defined and handled.

### 3. Correct `isCustom` Flag Calculation:
*   **Issue:** The `isCustom` flag is incorrectly calculated as `false` when `next` is 'L' and `defaultUnit` is 'gal' (as seen in logs).
*   **Proposed Change:** Ensure the `isCustom` calculation (`next !== defaultUnit`) accurately reflects the difference. This relies on the `defaultUnit` being correct. If `next` is 'L' and `defaultUnit` is 'gal', `isCustom` *must* be `true`. The logic should then correctly set `fieldPreferences[fieldKey] = { unit: next, is_customized: true };`.

### 4. Refine Unit Toggling Logic:
*   **Issue:** The current binary toggle (`next = current === 'L' ? 'gal' : 'L';`) and the reliance on `isCustom` derived from `defaultUnit` comparisons are brittle.
*   **Proposed Change:** Consider a more robust state machine for unit toggling that explicitly handles custom states ('L*', 'gal*') and transitions between them and default states, rather than relying on a simple binary toggle and a potentially flawed `isCustom` flag. Ensure the `activePreset` remains consistent and correctly reflects the user's selection.

The core modification would be to remove or properly condition `this.activePreset = 'custom';`, fix the `defaultUnit` calculation, and ensure the `isCustom` flag accurately reflects the state, allowing the cycle to complete.