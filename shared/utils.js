/**
 * TubeLiberty Shared Utilities
 * Deduplicated helper functions used across multiple UI files
 */

/**
 * Format milliseconds to MM:SS string
 * @param {number} ms - Time in milliseconds
 * @returns {string} Formatted time string (e.g. "3:05")
 */
TL.formatTime = function (ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Update progress bar color based on percentage
 * @param {HTMLElement} element - The progress bar element
 * @param {number} percent - Current percentage (0-100)
 */
TL.updateProgressColor = function (element, percent) {
  element.classList.remove('safe', 'warning', 'danger');

  if (percent >= TL.thresholds.DANGER_PERCENT) {
    element.classList.add('danger');
  } else if (percent >= TL.thresholds.WARNING_PERCENT) {
    element.classList.add('warning');
  } else {
    element.classList.add('safe');
  }
};
