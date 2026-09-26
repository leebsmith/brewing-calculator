/**
 * Frontend application logic for Mono-Repo Default.
 * Registers Alpine.js components for reactive state and backend API calls.
 */

document.addEventListener('alpine:init', () => {
  Alpine.data('app', () => ({
    messageInput: '',
    loading: false,
    response: null,
    error: null,

    /**
     * Resolves API base URL based on runtime environment.
     * In production: relative path using Firebase Hosting rewrite (/api/**).
     * In local development (Hosting emulator on :5000): targets FastAPI native server (:8000).
     */
    getApiUrl(path) {
      const isLocalEmulator =
        (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') &&
        window.location.port === '5000';

      if (isLocalEmulator) {
        return `http://127.0.0.1:8000${path}`;
      }
      return path;
    },

    /**
     * Sends a ping request to the FastAPI backend.
     */
    async sendPing() {
      this.loading = true;
      this.error = null;
      this.response = null;

      try {
        const query = this.messageInput ? `?message=${encodeURIComponent(this.messageInput)}` : '';
        const url = this.getApiUrl(`/ping${query}`);

        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText || 'Backend request failed'}`);
        }

        this.response = await res.json();
      } catch (err) {
        this.error = err instanceof Error ? err.message : String(err);
      } finally {
        this.loading = false;
      }
    },

    /**
     * Clears previous response and error states.
     */
    clearResponse() {
      this.response = null;
      this.error = null;
    },

    /**
     * Formats numeric epoch timestamp for display.
     */
    formatTimestamp(ts) {
      if (!ts) return '';
      // Timestamp in models.py is integer seconds (or ms)
      const date = new Date(ts > 1e11 ? ts : ts * 1000);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    },
  }));
});
