/**
 * Frontend application logic for Mono-Repo Default.
 * Registers Alpine.js global auth store and components for API interactions.
 */

// Firebase Configuration (Emulator-compatible default)
const firebaseConfig = {
  apiKey: "demo-api-key",
  authDomain: "mono-repo-default.firebaseapp.com",
  projectId: "mono-repo-default",
  appId: "1:123456789:web:abcdef"
};

// Initialize Firebase App & Auth
const firebaseApp = typeof firebase !== 'undefined' ? firebase.initializeApp(firebaseConfig) : null;
const auth = firebaseApp ? firebase.auth() : null;

// Connect to local Auth emulator if running on localhost or 127.0.0.1
if (auth && (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost')) {
  auth.useEmulator('http://127.0.0.1:9099');
}

/**
 * Centralized authenticated API fetch wrapper.
 * Resolves local dev URL (:8000) vs production single-origin rewrites (/api/**)
 * and attaches Bearer ID token if authenticated.
 */
async function apiFetch(path, options = {}) {
  const isLocalEmulator =
    (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') &&
    window.location.port === '5000';

  const baseUrl = isLocalEmulator ? 'http://127.0.0.1:8000' : '';
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

document.addEventListener('alpine:init', () => {
  // Global Authentication Store
  Alpine.store('auth', {
    user: null,
    loading: true,
    error: null,

    init() {
      if (!auth) {
        this.loading = false;
        return;
      }

      auth.onAuthStateChanged((firebaseUser) => {
        if (firebaseUser) {
          this.user = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || 'Google User',
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL || null,
          };
        } else {
          this.user = null;
        }
        this.loading = false;
      });
    },

    async signInWithGoogle() {
      if (!auth) return;
      this.error = null;
      try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await auth.signInWithPopup(provider);
      } catch (err) {
        this.error = err.message;
        console.error('Google Sign-In failed:', err);
      }
    },

    async signOut() {
      if (!auth) return;
      this.error = null;
      try {
        await auth.signOut();
        this.user = null;
      } catch (err) {
        this.error = err.message;
        console.error('Sign-Out failed:', err);
      }
    },

    requireAuth(redirectUrl = '/index.html') {
      if (!this.loading && !this.user) {
        window.location.replace(redirectUrl);
      }
    }
  });

  // Global UI Store for notifications
  Alpine.store('ui', {
    toasts: [],
    add(message, type = 'info', timeout = 4000) {
      const id = Date.now();
      this.toasts.push({ id, message, type });
      setTimeout(() => this.remove(id), timeout);
    },
    remove(id) {
      this.toasts = this.toasts.filter(t => t.id !== id);
    }
  });

  // Main Page Interactive Component
  Alpine.data('app', () => ({
    messageInput: '',
    loading: false,
    response: null,
    error: null,

    async sendPing() {
      this.loading = true;
      this.error = null;
      this.response = null;

      try {
        const query = this.messageInput ? `?message=${encodeURIComponent(this.messageInput)}` : '';
        const res = await apiFetch(`/api/ping${query}`, { method: 'GET' });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.detail || `HTTP ${res.status}: ${res.statusText}`;
          Alpine.store('ui').add(errMsg, 'error');
          throw new Error(errMsg);
        }

        this.response = await res.json();
        Alpine.store('ui').add('Ping processed successfully!', 'success');
      } catch (err) {
        this.error = err instanceof Error ? err.message : String(err);
      } finally {
        this.loading = false;
      }
    },

    clearResponse() {
      this.response = null;
      this.error = null;
    },

    formatTimestamp(ts) {
      if (!ts) return '';
      const date = new Date(ts > 1e11 ? ts : ts * 1000);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    },
  }));
});
