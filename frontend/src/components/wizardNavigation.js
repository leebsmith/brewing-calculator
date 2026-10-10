/**
 * Isolated Wizard Navigation FSM
 * Handles 12-step sequential progression, high-water mark gates, and step status evaluation.
 */

import Alpine from 'alpinejs';
import { BREW_CONSTANTS } from '../../constants.js';

export function createWizardNavigation() {
  return {
    activeStep: 1,
    completedSteps: [],
    highWaterMark: 1,
    dirtySteps: [],
    expansionMode: 'exclusive',

    setActiveStep(stepNumber) {
      if (stepNumber <= this.highWaterMark || this.expansionMode === 'concurrent') {
        this.activeStep = stepNumber;
      }
    },

    markStepComplete(stepNumber) {
      if (!this.completedSteps.includes(stepNumber)) {
        this.completedSteps.push(stepNumber);
      }
      // Clamp advancement to the last implemented step. Without this, completing
      // the final step would set activeStep to a number with no matching panel,
      // collapsing the accordion to nothing.
      const lastStep = BREW_CONSTANTS.WIZARD_STEPS[BREW_CONSTANTS.WIZARD_STEPS.length - 1];
      const nextStep = Math.min(stepNumber + 1, lastStep);
      this.highWaterMark = Math.max(this.highWaterMark, nextStep);
      this.activeStep = nextStep;
      Alpine.store('ui').add(BREW_CONSTANTS.MSG_STEP_CONFIGURED_TEMPLATE(stepNumber), 'success');
    },

    invalidateDownstream(fromStepNumber) {
      // Derived from the canonical downstream roster in constants.js rather
      // than a hardcoded literal, so adding/removing a step only requires
      // editing one place.
      this.dirtySteps = BREW_CONSTANTS.WIZARD_DOWNSTREAM_STEPS.filter(
        step => step > fromStepNumber
      );
    },

    toggleExpansionMode() {
      this.expansionMode = this.expansionMode === 'exclusive' ? 'concurrent' : 'exclusive';
    },

    getStepStatusLabel(stepNum) {
      if (this.completedSteps.includes(stepNum)) return 'Configured';
      if (this.activeStep === stepNum) return 'Active';
      return 'Locked';
    },

    getStepStatusClass(stepNum) {
      if (this.completedSteps.includes(stepNum)) return 'accordion-status-complete';
      if (this.activeStep === stepNum) return 'accordion-status-active';
      return 'accordion-status-locked';
    }
  };
}
