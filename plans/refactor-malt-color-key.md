# Plan: Refactor Malt Color Key to Lovibond

## Objective

Correct the erroneous `color_srm` key in `backend/app/seeds/malts.json` and `backend/app/seeds/sugars.json` to `color_lovibond` and update all associated code to reflect this change, ensuring data integrity and accurate representation of malt colors.

## Current Flaw

The JSON files (`malts.json` and `sugars.json`) currently use the key `color_srm` to store malt/sugar color values, which are actually Lovibond degrees. This discrepancy can lead to confusion and potential errors in calculations or displays that rely on this field.

## Scope

This refactor will involve modifications to:
*   The `scripts/build_fermentables.py` script.
*   The generated `backend/app/seeds/malts.json` and `backend/app/seeds/sugars.json` files.
*   Backend Python code that consumes or processes these JSON files.
*   Frontend code that directly or indirectly uses this color data.
*   Unit tests that assert against `color_srm`.

## Steps

### 1. Update `scripts/build_fermentables.py`

*   **Action:** Modify the `determine_malt_parameters` and `determine_sugar_parameters` functions within `scripts/build_fermentables.py`.
*   **Detail:** Locate where the `color_srm` key is assigned or referenced when constructing the dictionary for malt/sugar parameters. Change all instances of `color_srm` to `color_lovibond`. Update the `FERMENTABLE_SPECS` dictionary keys from `srm` to `lovibond`.
*   **Verification:** Ensure the script now uses `color_lovibond` when creating the data structures that will be serialized into JSON.

### 2. Regenerate `backend/app/seeds/malts.json` and `backend/app/seeds/sugars.json`

*   **Action:** Execute the updated `scripts/build_fermentables.py` script.
*   **Detail:** Run the script from the project root to generate the new JSON files in the `backend/app/seeds/` directory.
*   **Verification:** Manually inspect the generated JSON files to confirm that the `color_lovibond` key is present and correctly populated, and `color_srm` is absent.

### 3. Update Backend Code

*   **Action:** Identify and modify Python code that loads or uses the color data from the JSON files.
*   **Detail:** Search the backend codebase (primarily within `backend/app/` and potentially data seeding scripts) for any file that reads `malts.json` or `sugars.json`.
*   **Update:** Adjust the code to reference the `color_lovibond` key when accessing color data. This might involve updating dictionary lookups, Pydantic model field access, or any other data processing logic.
*   **Verification:** Run backend unit tests to ensure that color data is being accessed and used correctly under the new key.

### 4. Update Frontend Code

*   **Action:** Investigate and update frontend code that directly or indirectly consumes the color data.
*   **Detail:** Review frontend code, particularly `frontend/src/utils/pureFunctions.js`, `frontend/script.js`, `frontend/index.html`, and `public/index.html`, for references to `color_srm` or UI text displaying "SRM".
*   **Update:** Replace `color_srm` with `color_lovibond` and adjust UI text from "SRM" to "Lovibond" where appropriate.
*   **Verification:** Test frontend features that display or use malt/sugar color information.

### 4a. Make the `color` unit domain Lovibond-native

*   **Action:** Rename the `color` domain's base unit from `SRM` to `Lovibond` so the unit system matches the stored data.
*   **Detail:** In `frontend/constants.js`, change `DOMAIN_BINARY_PAIRS.color` from `['EBC', 'SRM']` to `['EBC', 'Lovibond']`. In `frontend/script.js`, rename the `UNIT_REGISTRY.color` unit key `SRM` to `Lovibond` and update its label. The `ECB` unit's `to_base`/`from_base` factors are left at `1.97` (the legacy SRM->EBC factor reinterpreted as Lovibond->EBC) so no displayed EBC value changes; a true Lovibond->EBC conversion would be ~`1.379` and is deferred.
*   **Verification:** Confirm `$store.units.getFieldUnit('color')` returns `'Lovibond'` in metric mode and `'EBC'` in imperial mode, and that the grain bill editor's color column header reads "Lovibond".

### 5. Update Tests

*   **Action:** Modify test files to reflect the change.
*   **Detail:** Update assertions in test files (e.g., `backend/tests/test_seeds.py`, `backend/tests/test_primitives.py`) that check for `color_srm`.
*   **Update:** Change assertions to check for `color_lovibond`.

## Estimated Effort

Medium, due to the need to update multiple file types and search for all occurrences.

## Rollback Plan

If issues arise, revert the changes in `scripts/build_fermentables.py`, the JSON files, backend code, frontend code, and test files.
