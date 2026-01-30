/**
 * TubeLiberty Onboarding Page
 * Multi-step welcome flow for new users
 */

let currentStep = 1;
const totalSteps = 4;

/**
 * Initialize the onboarding page
 */
function init() {
  attachEventListeners();
  showStep(1);
}

/**
 * Attach event listeners
 */
function attachEventListeners() {
  // Step buttons
  document.getElementById('btn-start').addEventListener('click', () => goToStep(2));
  document.getElementById('btn-continue-2').addEventListener('click', () => goToStep(3));
  document.getElementById('btn-continue-3').addEventListener('click', () => goToStep(4));
  document.getElementById('btn-finish').addEventListener('click', finishOnboarding);

  // Progress dots
  document.querySelectorAll('.dot').forEach(dot => {
    dot.addEventListener('click', () => {
      const step = parseInt(dot.dataset.step);
      if (step <= currentStep) {
        goToStep(step);
      }
    });
  });
}

/**
 * Show a specific step
 */
function showStep(step) {
  // Hide all steps
  document.querySelectorAll('.onboarding-step').forEach(s => {
    s.classList.remove('active');
  });

  // Show the target step
  document.getElementById(`step-${step}`).classList.add('active');

  // Update progress dots
  updateProgressDots(step);

  currentStep = step;
}

/**
 * Go to a specific step with animation
 */
function goToStep(step) {
  if (step < 1 || step > totalSteps) return;
  showStep(step);
}

/**
 * Update progress dots
 */
function updateProgressDots(activeStep) {
  document.querySelectorAll('.dot').forEach(dot => {
    const dotStep = parseInt(dot.dataset.step);
    dot.classList.toggle('active', dotStep === activeStep);
  });
}

/**
 * Finish onboarding and redirect to YouTube
 */
function finishOnboarding() {
  // Mark onboarding as complete
  chrome.storage.local.set({ onboardingComplete: true }, () => {
    // Redirect to YouTube
    window.location.href = 'https://www.youtube.com';
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
