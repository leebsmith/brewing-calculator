/**
 * Global Authentication Store.
 */

import Alpine from 'alpinejs';
import { auth } from '../api/firebase.js';

export default {
  user: null,
  loading: true,
  error: null,

  init() {
    if (!auth) {
      this.loading = false;
      return;
    }

    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        this.user = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || 'Google User',
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL || null,
        };
        // Fetch ingredient catalog and equipment profiles upon successful authentication
        Alpine.store('catalog').fetchCatalog();
        Alpine.store('equipment').fetchProfiles();
      } else {
        this.user = null;
        Alpine.store('catalog').malts = [];
        Alpine.store('catalog').sugars = [];
        Alpine.store('catalog').loaded = false;
        Alpine.store('equipment').profiles = [];
        Alpine.store('equipment').loaded = false;
      }
      this.loading = false;
    });

    if (this.$cleanup) {
        this.$cleanup(() => unsubscribe());
    }
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
};
