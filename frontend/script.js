/**
 * New Vite-compatible entrypoint for Mono-Repo Default.
 * Wires up Alpine, plugins, stores, and components from the extracted modules.
 */

import Alpine from 'alpinejs';
import collapse from '@alpinejs/collapse';

// Initialize Firebase API (side-effect: sets up app, auth, emulator wiring).
import { auth } from './src/api/firebase.js';

// Stores
import unitsStore from './src/stores/unitsStore.js';
import maltGridStore from './src/stores/maltGridStore.js';
import authStore from './src/stores/authStore.js';
import mashModalStore from './src/stores/mashModalStore.js';
import uiStore from './src/stores/uiStore.js';
import catalogStore from './src/stores/catalogStore.js';
import equipmentStore from './src/stores/equipmentStore.js';

// Components
import { createWizardNavigation } from './src/components/wizardNavigation.js';
import { createEquipmentManager } from './src/components/equipmentManager.js';
import wizard from './src/components/wizard.js';
import app from './src/components/app.js';

// Setup Alpine Native Plugins
window.Alpine = Alpine;
Alpine.plugin(collapse);

// Register stores
Alpine.store('units', unitsStore);
Alpine.store('maltGrid', maltGridStore);
Alpine.store('auth', authStore);
Alpine.store('mashModal', mashModalStore);
Alpine.store('ui', uiStore);
Alpine.store('catalog', catalogStore);
Alpine.store('equipment', equipmentStore);

// Register components
Alpine.data('wizardNavigation', () => createWizardNavigation());
Alpine.data('equipmentManager', () => createEquipmentManager());
Alpine.data('wizard', wizard);
Alpine.data('app', app);

// Finally, start Alpine natively
Alpine.start();
