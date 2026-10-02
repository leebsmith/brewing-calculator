import { PurgeCSS } from 'purgecss';

/**
 * PurgeCSS Analysis Linter
 * Scans HTML and JS for dynamically and statically bound classes.
 * Compares the usage against style.css to detect orphaned CSS rules.
 */
async function runPurgeCSSLint() {
  const purgeCSS = new PurgeCSS();
  
  const results = await purgeCSS.purge({
    content: ['frontend/index.html', 'frontend/script.js'],
    css: ['frontend/style.css'],
    rejected: true,
    defaultExtractor: content => content.match(/[A-Za-z0-9_-]+/g) || [],
    safelist: {
      standard: ['body', 'html', 'x-cloak', 'x-show', 'x-collapse', 'kbd', 'samp', 'form-actions', 'panel-timestamp', 'panel-ledger'],
      greedy: [
        /^toast-/,
        /^status-badge-/,
        /^status-dot-/,
        /^tri-state-pill-/,
        /^badge-/,
        /^alert/,
        /^ledger/,
        /^metric/,
        /^input-addon/,
        /^drawer/,
        /^btn/,
        /^panel-/,
        /^accordion-status-/,
        /is-locked/,
        /is-dirty/,
        /is-selected/,
        /aria-disabled/
      ]
    }
  });

  let hasOrphanedCSS = false;

  results.forEach(result => {
    if (result.rejected && result.rejected.length > 0) {
      hasOrphanedCSS = true;
      console.error(`\x1b[31m[PurgeCSS] Error: Orphaned CSS detected in ${result.file}\x1b[0m`);
      
      result.rejected.forEach(rejectedClass => {
        console.error(`  - Unused selector: \x1b[33m${rejectedClass}\x1b[0m`);
      });
      console.error(`\x1b[31mTotal orphaned selectors: ${result.rejected.length}\x1b[0m\n`);
    }
  });

  if (hasOrphanedCSS) {
    console.error(`\x1b[31mAction Required: Remove the orphaned CSS selectors from style.css or ensure they are properly safelisted in purgecss-linter.js if injected dynamically.\x1b[0m`);
    process.exit(1);
  } else {
    console.log(`\x1b[32m[PurgeCSS] Success: No orphaned CSS code detected.\x1b[0m`);
    process.exit(0);
  }
}

runPurgeCSSLint().catch(err => {
  console.error("Fatal error during PurgeCSS execution:", err);
  process.exit(1);
});
