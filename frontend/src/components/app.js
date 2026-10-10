/**
 * Main Page Interactive Component.
 */

import Alpine from 'alpinejs';
import { apiFetch } from '../api/firebase.js';
import { BREW_CONSTANTS } from '../../constants.js';

export default () => ({
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
      Alpine.store('ui').add(BREW_CONSTANTS.MSG_PING_PROCESSED_SUCCESSFULLY, 'success');
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
});
