/**
 * TubeLiberty Side Panel
 * Dashboard for viewing stats and managing limits
 */

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
  historyList: null,

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

  // Toast
  successToast: null,
  toastMessage: null,
};

/**
 * Initialize the side panel
 */
function init() {
  console.log('TubeLiberty side panel initializing...');
  cacheElements();
  attachEventListeners();
  loadStats();

  // Check if we should open to settings view
  chrome.storage.local.get(['openToSettings'], (result) => {
    if (result.openToSettings) {
      chrome.storage.local.remove('openToSettings');
      showSettingsView();
    }
  });

  // Refresh stats periodically
  setInterval(loadStats, 5000);
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
  elements.historyList = document.getElementById('history-list');

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
      const extraMinutes = Math.round(response.extraTime / 60000);
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
  const timeLimit = stats.timeLimit || 180000;
  const timePercent = Math.min((timeUsed / timeLimit) * 100, 100);

  elements.timeValue.textContent = `${formatTime(timeUsed)} / ${formatTime(timeLimit)}`;
  elements.timeProgress.style.width = `${timePercent}%`;
  updateProgressColor(elements.timeProgress, timePercent);

  // Update shorts progress
  const shortsUsed = stats.totalWatchedShorts || 0;
  const shortsLimit = stats.shortsLimit || 5;
  const shortsPercent = Math.min((shortsUsed / shortsLimit) * 100, 100);

  elements.shortsValue.textContent = `${shortsUsed} / ${shortsLimit}`;
  elements.shortsProgress.style.width = `${shortsPercent}%`;
  updateProgressColor(elements.shortsProgress, shortsPercent);

  // Update shorts reset time
  const lastRestTime = stats.lastRestTime || Date.now();
  const resetTime = new Date(lastRestTime + (stats.shortsPeriodHours * 60 * 60 * 1000));
  const now = new Date();
  if (resetTime > now) {
    const remainingMs = resetTime - now;
    const remainingMins = Math.ceil(remainingMs / 60000);
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
 * Update progress bar color based on percentage
 */
function updateProgressColor(element, percent) {
  element.classList.remove('safe', 'warning', 'danger');

  if (percent >= 90) {
    element.classList.add('danger');
  } else if (percent >= 70) {
    element.classList.add('warning');
  } else {
    element.classList.add('safe');
  }
}

/**
 * Format milliseconds to MM:SS
 */
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format date for history display
 */
function formatHistoryDate(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    const daysAgo = Math.floor((today - date) / (1000 * 60 * 60 * 24));
    return `${daysAgo} days ago`;
  }
}

/**
 * Update history list
 */
function updateHistory(history) {
  if (!history || history.length === 0) {
    elements.historyList.innerHTML = '<li class="history-empty">No history yet. Check back tomorrow!</li>';
    return;
  }

  elements.historyList.innerHTML = history.map(entry => `
    <li class="history-item">
      <span class="history-date">${formatHistoryDate(entry.date)}</span>
      <div class="history-stats">
        <span class="history-stat">
          <span>⏱️</span>
          ${formatTime(entry.time)}
        </span>
        <span class="history-stat">
          <span>📱</span>
          ${entry.shorts}
        </span>
      </div>
    </li>
  `).join('');
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

  // Switch views
  elements.dashboardView.classList.add('hidden');
  elements.increaseShortsView.classList.add('hidden');
  elements.increaseTimeView.classList.remove('hidden');
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

  // Switch views
  elements.dashboardView.classList.add('hidden');
  elements.increaseTimeView.classList.add('hidden');
  elements.increaseShortsView.classList.remove('hidden');
}

/**
 * Show dashboard view
 */
function showDashboard() {
  elements.increaseTimeView.classList.add('hidden');
  elements.increaseShortsView.classList.add('hidden');
  elements.settingsView.classList.add('hidden');
  elements.dashboardView.classList.remove('hidden');

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

  // Switch views
  elements.dashboardView.classList.add('hidden');
  elements.increaseTimeView.classList.add('hidden');
  elements.increaseShortsView.classList.add('hidden');
  elements.settingsView.classList.remove('hidden');
}

/**
 * Load settings from storage
 */
function loadSettings() {
  chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
    if (response) {
      // Convert milliseconds to minutes for time inputs
      elements.settingTimeLimit.value = Math.round(response.timeLimit / 60000);
      elements.settingShortsLimit.value = response.shortsLimit;
      elements.settingShortsPeriod.value = response.shortsPeriodHours;
      elements.settingExtraTime.value = Math.round(response.extraTime / 60000);
      elements.settingExtraShorts.value = response.extraShorts;
    }
  });
}

/**
 * Save settings to storage
 */
function saveSettings() {
  const settings = {
    // Convert minutes to milliseconds for storage
    timeLimit: parseInt(elements.settingTimeLimit.value) * 60 * 1000,
    shortsLimit: parseInt(elements.settingShortsLimit.value),
    shortsPeriodHours: parseInt(elements.settingShortsPeriod.value),
    extraTime: parseInt(elements.settingExtraTime.value) * 60 * 1000,
    extraShorts: parseInt(elements.settingExtraShorts.value)
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
  }, 3000);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
