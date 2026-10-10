/**
 * Firebase initialization and the centralized authenticated API fetch wrapper.
 */

import { BREW_CONSTANTS } from '../../constants.js';

// Firebase Configuration
export const firebaseConfig = {
  apiKey: "AIzaSyBBuDb_MHITk-wNTvwbiklhrRxFGEi04P4",
  authDomain: "batch-brewing-calculator.firebaseapp.com",
  projectId: "batch-brewing-calculator",
  storageBucket: "batch-brewing-calculator.firebasestorage.app",
  messagingSenderId: "1062737044340",
  appId: "1:1062737044340:web:5b24e2450ac96449ee8221"
};

// Initialize Firebase App & Auth
export const firebaseApp = typeof firebase !== 'undefined' ? firebase.initializeApp(firebaseConfig) : null;
export const auth = firebaseApp ? firebase.auth() : null;

// Connect to local Auth emulator if running on localhost or 127.0.0.1
if (auth && typeof window !== 'undefined' && (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost')) {
  auth.useEmulator(`http://127.0.0.1:${BREW_CONSTANTS.AUTH_EMULATOR_PORT}`); // Use constant for port
}

/**
 * Centralized authenticated API fetch wrapper.
 * Resolves local dev URL (:8000) vs production single-origin rewrites (/api/**)
 * and attaches Bearer ID token if authenticated.
 */
export async function apiFetch(path, options = {}) {
  // Detect if running in a local development environment (e.g., Vite dev server on any port)
  // Added '0.0.0.0' as it's commonly used for local development servers.
  const isLocalDev = typeof window !== 'undefined' &&
                     (window.location.hostname === '127.0.0.1' ||
                      window.location.hostname === 'localhost' ||
                      window.location.hostname === '0.0.0.0'); // Added this condition

  // If running locally, explicitly target the backend on the configured API URL.
  // If not local, use relative path (which Firebase Hosting rewrites handle in production).
  const baseUrl = isLocalDev ? BREW_CONSTANTS.BACKEND_API_URL : '';
  const url = `${baseUrl}${path}`;

  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');

  if (auth && auth.currentUser) {
    try {
      const idToken = await auth.currentUser.getIdToken();
      headers.set('Authorization', `Bearer ${idToken}`);
    } catch (err) {
      console.warn('Failed to retrieve Firebase ID token:', err);
    }
  }

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    console.warn(`Unauthorized request to: ${path}`);
  }

  return response;
}
