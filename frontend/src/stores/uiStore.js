/**
 * Global UI Store for notifications.
 */

export default {
  toasts: [],
  add(message, type = 'info', timeout = 4000) {
    const id = Date.now();
    this.toasts.push({ id, message, type });
    setTimeout(() => this.remove(id), timeout);
  },
  remove(id) {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }
};
