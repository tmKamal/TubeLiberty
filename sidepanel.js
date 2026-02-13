/**
 * TubeLiberty Side Panel
 * Dashboard for viewing stats and managing limits
 */

const K = TL.keys;
const D = TL.defaults;
const V = TL.validation;

// Commitment messages for increasing time limit (moderate tone)
const timeCommitmentMessages = [
  'I am choosing distraction over my goals',
  'I accept that I am breaking my commitment',
  'My focus can wait a little longer',
  'I am okay with losing my progress today',
  'This video is worth more than my discipline',
];

// Commitment messages for increasing shorts limit (harsh tone)
const shortsCommitmentMessages = [
  'I am wasting my life on content that does not matter',
  'I choose mindless scrolling over meaningful activities',
  'Shorts are more important than my goals right now',
  'I am feeding my addiction instead of fighting it',
  'I accept that I have no self-control today',
];

// All view IDs for the showView() helper
const VIEW_IDS = ['dashboard-view', 'increase-time-view', 'increase-shorts-view', 'settings-view'];

// State
let currentStats = null;
let selectedTimeCommitment = '';
let selectedShortsCommitment = '';

// DOM Elements
const elements = {
  // Views
  dashboardView: null,
  increaseTimeView: null,
  increaseShortsView: null,
  settingsView: null,

  // Dashboard elements
  timeValue: null,
  timeProgress: null,
  shortsValue: null,
  shortsProgress: null,
  shortsResetTime: null,
  videosValue: null,
  timeStreakCount: null,
  shortsStreakCount: null,
  timeStreakCard: null,
  shortsStreakCard: null,
  historyChart: null,

  // Buttons
  btnSettings: null,
  btnIncreaseTime: null,
  btnIncreaseShorts: null,
  btnIncreaseTimeText: null,
  btnIncreaseShortsText: null,
  btnConfirmTime: null,
  btnCancelTime: null,
  btnConfirmShorts: null,
  btnCancelShorts: null,
  confirmTimeText: null,
  confirmShortsText: null,
  btnSaveSettings: null,
  btnCancelSettings: null,

  // Settings inputs
  settingTimeLimit: null,
  settingShortsLimit: null,
  settingShortsPeriod: null,
  settingExtraTime: null,
  settingExtraShorts: null,
  settingsForm: null,

  // Commitment inputs
  timeCommitmentText: null,
  timeCommitmentInput: null,
  timeMatchIndicator: null,
  shortsCommitmentText: null,
  shortsCommitmentInput: null,
  shortsMatchIndicator: null,

  // Streak displays in warning views
  currentTimeStreak: null,
  currentShortsStreak: null,

  // Settings note
  settingsLimitsNote: null,

  // Toast
  successToast: null,
  toastMessage: null,
};

// Original values for daily limit fields (set when settings are loaded)
let savedLimitValues = {};


/**
 * Initialize the side panel
 */
function init() {
  console.log('TubeLiberty side panel initializing...');
  cacheElements();
  attachEventListeners();
  loadStats();

  // Check if we should open to settings view
  chrome.storage.local.get([K.OPEN_TO_SETTINGS], (result) => {
    if (result[K.OPEN_TO_SETTINGS]) {
      chrome.storage.local.remove(K.OPEN_TO_SETTINGS);
      showSettingsView();
    }
  });

  // Refresh stats periodically
  setInterval(loadStats, TL.timing.STATS_REFRESH_MS);
}

/**
 * Cache DOM elements
 */
function cacheElements() {
  elements.dashboardView = document.getElementById('dashboard-view');
  elements.increaseTimeView = document.getElementById('increase-time-view');
  elements.increaseShortsView = document.getElementById('increase-shorts-view');
  elements.settingsView = document.getElementById('settings-view');

  elements.timeValue = document.getElementById('time-value');
  elements.timeProgress = document.getElementById('time-progress');
  elements.shortsValue = document.getElementById('shorts-value');
  elements.shortsProgress = document.getElementById('shorts-progress');
  elements.shortsResetTime = document.getElementById('shorts-reset-time');
  elements.videosValue = document.getElementById('videos-value');
  elements.timeStreakCount = document.getElementById('time-streak-count');
  elements.shortsStreakCount = document.getElementById('shorts-streak-count');
  elements.timeStreakCard = document.getElementById('time-streak-card');
  elements.shortsStreakCard = document.getElementById('shorts-streak-card');
  elements.historyChart = document.getElementById('history-chart');

  elements.btnSettings = document.getElementById('btn-settings');
  elements.btnIncreaseTime = document.getElementById('btn-increase-time');
  elements.btnIncreaseShorts = document.getElementById('btn-increase-shorts');
  elements.btnIncreaseTimeText = document.getElementById('btn-increase-time-text');
  elements.btnIncreaseShortsText = document.getElementById('btn-increase-shorts-text');
  elements.btnConfirmTime = document.getElementById('btn-confirm-time');
  elements.btnCancelTime = document.getElementById('btn-cancel-time');
  elements.btnConfirmShorts = document.getElementById('btn-confirm-shorts');
  elements.btnCancelShorts = document.getElementById('btn-cancel-shorts');
  elements.confirmTimeText = document.getElementById('confirm-time-text');
  elements.confirmShortsText = document.getElementById('confirm-shorts-text');
  elements.btnSaveSettings = document.getElementById('btn-save-settings');
  elements.btnCancelSettings = document.getElementById('btn-cancel-settings');

  elements.settingTimeLimit = document.getElementById('setting-time-limit');
  elements.settingShortsLimit = document.getElementById('setting-shorts-limit');
  elements.settingShortsPeriod = document.getElementById('setting-shorts-period');
  elements.settingExtraTime = document.getElementById('setting-extra-time');
  elements.settingExtraShorts = document.getElementById('setting-extra-shorts');
  elements.settingsForm = document.getElementById('settings-form');
  elements.settingsLimitsNote = document.getElementById('settings-limits-note');

  elements.timeCommitmentText = document.getElementById('time-commitment-text');
  elements.timeCommitmentInput = document.getElementById('time-commitment-input');
  elements.timeMatchIndicator = document.getElementById('time-match-indicator');
  elements.shortsCommitmentText = document.getElementById('shorts-commitment-text');
  elements.shortsCommitmentInput = document.getElementById('shorts-commitment-input');
  elements.shortsMatchIndicator = document.getElementById('shorts-match-indicator');

  elements.currentTimeStreak = document.getElementById('current-time-streak');
  elements.currentShortsStreak = document.getElementById('current-shorts-streak');

  elements.successToast = document.getElementById('success-toast');
  elements.toastMessage = document.getElementById('toast-message');
}

/**
 * Attach event listeners
 */
function attachEventListeners() {
  // Settings button
  elements.btnSettings.addEventListener('click', () => showSettingsView());

  // Dashboard buttons
  elements.btnIncreaseTime.addEventListener('click', () => showIncreaseTimeView());
  elements.btnIncreaseShorts.addEventListener('click', () => showIncreaseShortsView());

  // Time limit flow
  elements.btnCancelTime.addEventListener('click', () => showDashboard());
  elements.btnConfirmTime.addEventListener('click', () => confirmIncreaseTime());
  elements.timeCommitmentInput.addEventListener('input', () => validateTimeCommitment());

  // Shorts limit flow
  elements.btnCancelShorts.addEventListener('click', () => showDashboard());
  elements.btnConfirmShorts.addEventListener('click', () => confirmIncreaseShorts());
  elements.shortsCommitmentInput.addEventListener('input', () => validateShortsCommitment());

  // Settings flow
  elements.settingsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveSettings();
  });
  elements.btnCancelSettings.addEventListener('click', () => showDashboard());

  // Show/hide note when daily limit fields change
  elements.settingTimeLimit.addEventListener('input', checkLimitsChanged);
  elements.settingShortsLimit.addEventListener('input', checkLimitsChanged);
  elements.settingShortsPeriod.addEventListener('input', checkLimitsChanged);
}

/**
 * Load stats from service worker
 */
function loadStats() {
  chrome.runtime.sendMessage({ action: 'getStats' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error getting stats:', chrome.runtime.lastError.message);
      return;
    }
    if (response) {
      currentStats = response;
      updateDashboard(response);
      updateButtonLabels();
    } else {
      console.warn('No response from service worker');
    }
  });
}

/**
 * Update button labels based on config values
 */
function updateButtonLabels() {
  chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
    if (response) {
      const extraMinutes = Math.round(response.extraTime / TL.MS_PER_MINUTE);
      const extraShorts = response.extraShorts;

      // Update dashboard buttons
      if (elements.btnIncreaseTimeText) {
        elements.btnIncreaseTimeText.textContent = `Add ${extraMinutes} Minutes`;
      }
      if (elements.btnIncreaseShortsText) {
        elements.btnIncreaseShortsText.textContent = `Add ${extraShorts} Shorts`;
      }

      // Update confirmation view buttons
      if (elements.confirmTimeText) {
        elements.confirmTimeText.textContent = `Add ${extraMinutes} More Minutes`;
      }
      if (elements.confirmShortsText) {
        elements.confirmShortsText.textContent = `Add ${extraShorts} More Shorts`;
      }
    }
  });
}

/**
 * Update dashboard with stats
 */
function updateDashboard(stats) {
  // Update time progress
  const timeUsed = stats.totalWatchedTime || 0;
  const timeLimit = stats.timeLimit || D.TIME_LIMIT_MS;
  const timePercent = Math.min((timeUsed / timeLimit) * 100, 100);

  elements.timeValue.textContent = `${TL.formatTime(timeUsed)} / ${TL.formatTime(timeLimit)}`;
  elements.timeProgress.style.width = `${timePercent}%`;
  TL.updateProgressColor(elements.timeProgress, timePercent);

  // Update shorts progress
  const shortsUsed = stats.totalWatchedShorts || 0;
  const shortsLimit = stats.shortsLimit || D.SHORTS_LIMIT;
  const shortsPercent = Math.min((shortsUsed / shortsLimit) * 100, 100);

  elements.shortsValue.textContent = `${shortsUsed} / ${shortsLimit}`;
  elements.shortsProgress.style.width = `${shortsPercent}%`;
  TL.updateProgressColor(elements.shortsProgress, shortsPercent);

  // Update shorts reset time
  const lastRestTime = stats.lastRestTime || Date.now();
  const resetTime = new Date(lastRestTime + (stats.shortsPeriodHours * TL.MS_PER_HOUR));
  const now = new Date();
  if (resetTime > now) {
    const remainingMs = resetTime - now;
    const remainingMins = Math.ceil(remainingMs / TL.MS_PER_MINUTE);
    if (remainingMins > 60) {
      const hours = Math.floor(remainingMins / 60);
      const mins = remainingMins % 60;
      elements.shortsResetTime.textContent = `Resets in ${hours}h ${mins}m`;
    } else {
      elements.shortsResetTime.textContent = `Resets in ${remainingMins}m`;
    }
  } else {
    elements.shortsResetTime.textContent = '';
  }

  // Update videos watched
  elements.videosValue.textContent = stats.totalVideosWatched || 0;

  // Update streaks
  elements.timeStreakCount.textContent = stats.timeStreak || 0;
  elements.shortsStreakCount.textContent = stats.shortsStreak || 0;

  // Update streak card states
  if (stats.timeStreakBrokenToday) {
    elements.timeStreakCard.classList.add('broken');
  } else {
    elements.timeStreakCard.classList.remove('broken');
  }

  if (stats.shortsStreakBrokenToday) {
    elements.shortsStreakCard.classList.add('broken');
  } else {
    elements.shortsStreakCard.classList.remove('broken');
  }

  // Update history
  updateHistory(stats.history || []);
}

/**
 * Get short day name from a date string
 */
function getShortDay(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
}

/**
 * Update history bar chart
 */
function updateHistory(history) {
  if (!history || history.length === 0) {
    elements.historyChart.innerHTML = '<p class="history-empty">No history yet. Check back tomorrow!</p>';
    return;
  }

  // Show oldest first (left to right)
  const entries = [...history].reverse();

  // Find max time to scale bars (floor at 1ms to avoid division by zero)
  const maxTime = Math.max(1, ...entries.map(e => e.time));

  elements.historyChart.innerHTML = `
    <div class="chart-bars">
      ${entries.map(entry => {
        const percent = Math.round((entry.time / maxTime) * 100);
        const timeLabel = TL.formatTime(entry.time);
        return `
          <div class="chart-column">
            <span class="chart-value">${timeLabel}</span>
            <div class="chart-bar-track">
              <div class="chart-bar" style="height: ${percent}%"></div>
            </div>
            <span class="chart-label">${getShortDay(entry.date)}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

/**
 * Switch to the named view, hiding all others
 */
function showView(viewId) {
  VIEW_IDS.forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
  document.getElementById(viewId).classList.remove('hidden');
}

/**
 * Show increase time view
 */
function showIncreaseTimeView() {
  // Select random commitment message
  selectedTimeCommitment = timeCommitmentMessages[
    Math.floor(Math.random() * timeCommitmentMessages.length)
  ];
  elements.timeCommitmentText.textContent = selectedTimeCommitment;
  elements.timeCommitmentInput.value = '';
  elements.btnConfirmTime.disabled = true;
  resetMatchIndicator(elements.timeMatchIndicator);

  // Update streak display
  elements.currentTimeStreak.textContent = currentStats?.timeStreak || 0;

  showView('increase-time-view');
}

/**
 * Show increase shorts view
 */
function showIncreaseShortsView() {
  // Select random commitment message
  selectedShortsCommitment = shortsCommitmentMessages[
    Math.floor(Math.random() * shortsCommitmentMessages.length)
  ];
  elements.shortsCommitmentText.textContent = selectedShortsCommitment;
  elements.shortsCommitmentInput.value = '';
  elements.btnConfirmShorts.disabled = true;
  resetMatchIndicator(elements.shortsMatchIndicator);

  // Update streak display
  elements.currentShortsStreak.textContent = currentStats?.shortsStreak || 0;

  showView('increase-shorts-view');
}

/**
 * Show dashboard view
 */
function showDashboard() {
  showView('dashboard-view');

  // Clear inputs
  elements.timeCommitmentInput.value = '';
  elements.shortsCommitmentInput.value = '';
  elements.btnConfirmTime.disabled = true;
  elements.btnConfirmShorts.disabled = true;
}

/**
 * Show settings view
 */
function showSettingsView() {
  // Load current settings into form
  loadSettings();
  showView('settings-view');
}

/**
 * Load settings from storage
 */
function loadSettings() {
  chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
    if (response) {
      // Convert milliseconds to minutes for time inputs
      elements.settingTimeLimit.value = Math.round(response.timeLimit / TL.MS_PER_MINUTE);
      elements.settingShortsLimit.value = response.shortsLimit;
      elements.settingShortsPeriod.value = response.shortsPeriodHours;
      elements.settingExtraTime.value = Math.round(response.extraTime / TL.MS_PER_MINUTE);
      elements.settingExtraShorts.value = response.extraShorts;

      // Store original daily limit values for change detection
      savedLimitValues = {
        timeLimit: elements.settingTimeLimit.value,
        shortsLimit: elements.settingShortsLimit.value,
        shortsPeriod: elements.settingShortsPeriod.value
      };

      // Hide note when settings are freshly loaded
      elements.settingsLimitsNote.classList.add('hidden');
    }
  });
}

/**
 * Check if any daily limit field has changed from its saved value
 */
function checkLimitsChanged() {
  const changed =
    elements.settingTimeLimit.value !== savedLimitValues.timeLimit ||
    elements.settingShortsLimit.value !== savedLimitValues.shortsLimit ||
    elements.settingShortsPeriod.value !== savedLimitValues.shortsPeriod;

  elements.settingsLimitsNote.classList.toggle('hidden', !changed);
}

/**
 * Validate a numeric input is an integer within [min, max]
 */
function isValidInt(value, min, max) {
  const n = parseInt(value, 10);
  return !isNaN(n) && n >= min && n <= max;
}

/**
 * Save settings to storage
 */
function saveSettings() {
  const rawTime = elements.settingTimeLimit.value;
  const rawShorts = elements.settingShortsLimit.value;
  const rawPeriod = elements.settingShortsPeriod.value;
  const rawExtraTime = elements.settingExtraTime.value;
  const rawExtraShorts = elements.settingExtraShorts.value;

  // Validate all inputs
  if (!isValidInt(rawTime, V.TIME_LIMIT_MIN, V.TIME_LIMIT_MAX)) {
    showToast(`Time limit must be ${V.TIME_LIMIT_MIN}-${V.TIME_LIMIT_MAX} minutes`);
    return;
  }
  if (!isValidInt(rawShorts, V.SHORTS_LIMIT_MIN, V.SHORTS_LIMIT_MAX)) {
    showToast(`Shorts limit must be ${V.SHORTS_LIMIT_MIN}-${V.SHORTS_LIMIT_MAX}`);
    return;
  }
  if (!isValidInt(rawPeriod, V.SHORTS_PERIOD_MIN, V.SHORTS_PERIOD_MAX)) {
    showToast(`Shorts period must be ${V.SHORTS_PERIOD_MIN}-${V.SHORTS_PERIOD_MAX} hours`);
    return;
  }
  if (!isValidInt(rawExtraTime, V.EXTRA_TIME_MIN, V.EXTRA_TIME_MAX)) {
    showToast(`Extra time must be ${V.EXTRA_TIME_MIN}-${V.EXTRA_TIME_MAX} minutes`);
    return;
  }
  if (!isValidInt(rawExtraShorts, V.EXTRA_SHORTS_MIN, V.EXTRA_SHORTS_MAX)) {
    showToast(`Extra shorts must be ${V.EXTRA_SHORTS_MIN}-${V.EXTRA_SHORTS_MAX}`);
    return;
  }

  const settings = {
    // Convert minutes to milliseconds for storage
    timeLimit: parseInt(rawTime, 10) * TL.MS_PER_MINUTE,
    shortsLimit: parseInt(rawShorts, 10),
    shortsPeriodHours: parseInt(rawPeriod, 10),
    extraTime: parseInt(rawExtraTime, 10) * TL.MS_PER_MINUTE,
    extraShorts: parseInt(rawExtraShorts, 10)
  };

  chrome.runtime.sendMessage({ action: 'saveSettings', settings }, (response) => {
    if (response?.success) {
      showToast('Settings saved');
      showDashboard();
      loadStats();
      updateButtonLabels();
    }
  });
}

/**
 * Validate time commitment input
 */
function validateTimeCommitment() {
  const input = elements.timeCommitmentInput.value.trim();
  const isMatch = input === selectedTimeCommitment;

  elements.btnConfirmTime.disabled = !isMatch;
  updateMatchIndicator(elements.timeMatchIndicator, isMatch);
}

/**
 * Validate shorts commitment input
 */
function validateShortsCommitment() {
  const input = elements.shortsCommitmentInput.value.trim();
  const isMatch = input === selectedShortsCommitment;

  elements.btnConfirmShorts.disabled = !isMatch;
  updateMatchIndicator(elements.shortsMatchIndicator, isMatch);
}

/**
 * Update match indicator state
 */
function updateMatchIndicator(indicator, isMatch) {
  const icon = indicator.querySelector('.match-icon');
  const text = indicator.querySelector('.match-text');

  if (isMatch) {
    indicator.classList.remove('not-matching');
    indicator.classList.add('matching');
    icon.textContent = '✓';
    text.textContent = 'Perfect match! Button enabled.';
  } else {
    indicator.classList.remove('matching');
    indicator.classList.add('not-matching');
    icon.textContent = '○';
    text.textContent = 'Type the text exactly to enable the button';
  }
}

/**
 * Reset match indicator to default state
 */
function resetMatchIndicator(indicator) {
  indicator.classList.remove('matching');
  indicator.classList.add('not-matching');
  indicator.querySelector('.match-icon').textContent = '○';
  indicator.querySelector('.match-text').textContent = 'Type the text exactly to enable the button';
}

/**
 * Confirm increase time limit
 */
function confirmIncreaseTime() {
  chrome.runtime.sendMessage({ action: 'increaseTimeLimit' }, (response) => {
    if (response?.success) {
      const extraMinutes = elements.confirmTimeText
        ? elements.confirmTimeText.textContent.match(/\d+/)?.[0] || '5'
        : '5';
      showToast(`${extraMinutes} minutes added. Streak reset.`);
      showDashboard();
      loadStats();
    }
  });
}

/**
 * Confirm increase shorts limit
 */
function confirmIncreaseShorts() {
  chrome.runtime.sendMessage({ action: 'increaseShortsLimit' }, (response) => {
    if (response?.success) {
      const extraShorts = elements.confirmShortsText
        ? elements.confirmShortsText.textContent.match(/\d+/)?.[0] || '3'
        : '3';
      showToast(`${extraShorts} shorts added. Streak reset.`);
      showDashboard();
      loadStats();
    }
  });
}

/**
 * Show toast notification
 */
function showToast(message) {
  elements.toastMessage.textContent = message;
  elements.successToast.classList.remove('hidden');

  setTimeout(() => {
    elements.successToast.classList.add('hidden');
  }, TL.timing.TOAST_DURATION_MS);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
