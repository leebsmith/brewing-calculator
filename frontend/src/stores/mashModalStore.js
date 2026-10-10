/**
 * Global Mash Modal Store (Step 6 Configure Rests modal visibility).
 */

export default {
  isOpen: false,
  open() {
    this.isOpen = true;
  },
  close() {
    this.isOpen = false;
  }
};
