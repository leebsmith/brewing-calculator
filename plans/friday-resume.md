Resume: brewing-calculator, branch v2-dag-engine                                                                                                                                              

Repo: brewing-calculator, branch v2-dag-engine. Last commit: 3351983 — "feat: add v_post_boil to stage cascade solver and API response".                                                      

Context: We are implementing a new backend batch-sparging solver per docs/batch-math/unified-treatment.md, following the staged plan in docs/batch-math/implementation-plan.md. Stages 1.0–1.5
are all committed and green (114 tests passing). The Stage Status table correctly shows all stages DONE.                                                                                      

We have just completed a significant architectural refactor on the frontend:                                                                                                                  

 1 Retired the legacy JS 2-DOF boil solver (ThermodynamicSolver in frontend/script.js). It computed V_pre_boil from a different anchor (V_post) than the Python solver's Phase 2 (which       
   reverses from V_ferm), producing two disagreeing values for the same quantity.                                                                                                             
 2 Made V_ferm a user input on Step 5 (Batch Sparge Solver), per unified-treatment.md §3. The Python solver is now the sole owner of the derived anchors.                                     
 3 Made target_abv a user input on Step 5 (always expressed as a percentage, no unit toggle).                                                                                                 
 4 Added v_post_boil to StageCascade in backend/app/core/batch_solver.py, computed via the hot-side kettle balance V_pre_boil - delta_v_evap. Threaded through StageCascadeModel and the      
   /api/solve-batch response.                                                                                                                                                                 
 5 Eliminated the target_volume_l / v_ferm redundancy — v_ferm is now the canonical packaged-volume field.                                                                                    
 6 Renumbered the wizard steps to be contiguous (1–5) after retiring the old Step 2 (Batch Metadata). Steps are now: 1 Equipment Profile, 2 Yeast Selection, 3 Fermentables, 4 Mash Profile, 5
   Batch Sparge Solver.                                                                                                                                                                       
 7 Made Step 5 results unit-aware — all volumes, masses, and gravities route through the units store with step5_* FIELD_REGISTRY entries.                                                     

Immediate next actions:                                                                                                                                                                       

 1 Verify the frontend still works end-to-end. The last few SEARCH/REPLACE blocks had partial-application issues (some blocks failed to match because the file state had drifted). Confirm    
   that:                                                                                                                                                                                      
    • frontend/script.js no longer contains ThermodynamicSolver, runBoilSolver, solverOutputs, toggleSolverPill, setBoilSolverMode, targetOgPoints, targetKettleExtract, or                   
      targetKettleExtractDisplay.                                                                                                                                                             
    • frontend/constants.js no longer contains SOLVER_VARIABLES, SOLVER_VALID_VARIABLES, SOLVER_INVALID_PAIRS, SOLVER_DEFAULT_OUTPUTS, or the MSG_SOLVER_* strings.                           
    • frontend/constants.js has DEFAULT_V_FERM_L and DEFAULT_TARGET_ABV, and the step5_v_ferm / step5_v_post_boil / step5_target_og FIELD_REGISTRY entries.                                   
    • frontend/src/partials/step-batch-solver.html has the V_ferm and target_abv input fields at the top of the step-card-content.                                                            
    • frontend/script.js's solveBatch() reads v_ferm and target_abv from the manifest, and writes v_post_boil from result.cascade.v_post_boil.                                                
 2 Run the full backend suite to confirm green: cd backend && uv run pytest -v.                                                                                                               
 3 Run the frontend and exercise Step 5 end-to-end: cd frontend && npm run dev.                                                                                                               

Key conventions:                                                                                                                                                                              

 • All solver math is pure functions in backend/app/core/batch_solver.py.                                                                                                                     
 • Metric units internally; GAMMA_METRIC = 385.5, V_BAR_METRIC = 0.625, K_ABS_TRUE_METRIC = 1.67, RHO_WATER_METRIC = 1.00, F_SHRINK_DEFAULT = 0.04.                                           
 • SolverValidationError(code, message) for typed validation failures; the API maps it to HTTP 422 with detail: {code, message}.                                                              
 • Tests run via cd backend && uv run pytest ....                                                                                                                                             
 • Commit at stage boundaries.                                                                                                                                                                
 • MANDATORY: never suggest a commit while any test is failing. Always run the full suite and confirm green before proposing a commit command.                                                
 • Frontend unit handling: every numeric field routes through Alpine.store('units') with a FIELD_REGISTRY entry; use volDisplay/setVolDisplay, massDisplay/setMassDisplay,                    
   gravityDisplay/setGravityDisplay, percentageDisplay/setPercentageDisplay, compoundDisplay/setCompoundDisplay.                                                                              

Files to add to the new chat:                                                                                                                                                                 

 • backend/app/core/batch_solver.py                                                                                                                                                           
 • backend/app/main.py                                                                                                                                                                        
 • backend/app/schemas/models.py                                                                                                                                                              
 • backend/tests/test_batch_solver_phase4.py                                                                                                                                                  
 • docs/batch-math/implementation-plan.md                                                                                                                                                     
 • docs/batch-math/unified-treatment.md                                                                                                                                                       
 • plans/vessel-loss-model.md                                                                                                                                                                 
 • frontend/script.js                                                                                                                                                                         
 • frontend/constants.js                                                                                                                                                                      
 • frontend/index.html                                                                                                                                                                        
 • frontend/src/partials/step-batch-solver.html                                                                                                                                               
 • frontend/src/partials/step-equipment-profile.html                                                                                                                                          
 • frontend/src/partials/step-yeast-selection.html                                                                                                                                            
 • frontend/src/partials/step-fermentables.html                                                                                                                                               
 • frontend/src/partials/step-mash-profile.html                                                                                                                                               

Deferred / future work (not yet in the plan):                                                                                                                                                 

 • Stage 5: reconcile the ASBC coefficients in batch_solver.py with the legacy utils.py versions (flagged in the batch_solver.py header). The two implementations differ slightly:            
    • batch_solver.py: plato_to_sg uses 1.0 + 0.0038661*p + 1.34e-5*p² + 4.3e-8*p³; sg_to_plato uses -463.37 + 668.72*sg - 205.35*sg².                                                        
    • utils.py: plato_to_sg uses 1.0000131 + 0.00386777*p + 1.27447e-5*p² + 6.34964e-8*p³; sg_to_plato uses ((135.997*sg - 630.272)*sg + 1111.14)*sg - 616.868.                               
 • Integration test hitting the real /api/solve-batch route with a mocked auth dependency.                                                                                                    
 • HLT water accounting — plans/vessel-loss-model.md §4.4/§4.5 describes HLT top-up and sparge salt dosing, which are not yet implemented in the UI.                                          
 • manifest.boil_solver_mode was removed; confirm nothing else reads it.                                                                                                                      
 • MSG_BATCH_NAME_REQUIRED, MSG_TARGET_VOLUME_REQUIRED, MSG_TARGET_OG_REQUIRED in constants.js are now unused (Step 2 was retired). Prune or keep as you prefer.                              
 • DEFAULT_TARGET_VOLUME_L in constants.js is now unused (replaced by DEFAULT_V_FERM_L). Prune or keep as you prefer.                                                                         
 • step2_* FIELD_REGISTRY entries (step2_preboil_volume_l, step2_postboil_volume_l, step2_target_volume_l, step2_preboil_gravity, step2_postboil_gravity) are stale — the Batch Metadata step 
   was retired. Prune them.                                                                                                                                                                   
 • SOLVER_VARIABLES references step2_boil_time_min as a fieldKey, but that key is not in FIELD_REGISTRY — a pre-existing latent bug. Moot if SOLVER_VARIABLES is removed.                     


Tokens: 180k sent, 1.8k received. Cost: $0.05 message, $0.89 session.

