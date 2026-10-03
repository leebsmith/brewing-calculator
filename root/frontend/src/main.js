import Alpine from 'alpinejs';
import collapse from '@alpinejs/collapse';

// Import all stores
import unitsStore from './stores/unitsStore.js';
import maltGridStore from './stores/maltGridStore.js';
import exampleStore from './stores/exampleStore.js';

// Register Alpine plugins
Alpine.plugin(collapse);

// Expose Alpine globally for debugging and potential external use
window.Alpine = Alpine;

// Register stores
Alpine.store('units', unitsStore);
Alpine.store('maltGrid', maltGridStore);
Alpine.store('example', exampleStore);

// Start Alpine.js - This must be the very last call.
Alpine.start();
