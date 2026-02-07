/**
 * TubeLiberty Popup
 * Quick stats view from browser toolbar
 */

const K = TL.keys;
const D = TL.defaults;

// DOM Elements
const elements = {
  timeCurrent: null,
  timeLimit: null,
  timeProgress: null,
  shortsCurrent: null,
  shortsLimit: null,
  shortsProgress: null,
  videosCount: null,
  timeStreakValue: null,
  shortsStreakValue: null,
  timeStreakMini: null,
  shortsStreakMini: null,
  btnOpenDashboard: null,
  btnSettings: null,
};

/**
 * Initialize the popup
 */
function init() {
  cacheElements();
  attachEventListeners();
  loadStats();
}

/**
 * Cache DOM elements
 */
function cacheElements() {
  elements.timeCurrent = document.getElementById('time-current');
  elements.timeLimit = document.getElementById('time-limit');
  elements.timeProgress = document.getElementById('time-progress');
  elements.shortsCurrent = document.getElementById('shorts-current');
  elements.shortsLimit = document.getElementById('shorts-limit');
  elements.shortsProgress = document.getElementById('shorts-progress');
  elements.videosCount = document.getElementById('videos-count');
  elements.timeStreakValue = document.getElementById('time-streak-value');
  elements.shortsStreakValue = document.getElementById('shorts-streak-value');
  elements.timeStreakMini = document.getElementById('time-streak-mini');
  elements.shortsStreakMini = document.getElementById('shorts-streak-mini');
  elements.btnOpenDashboard = document.getElementById('btn-open-dashboard');
  elements.btnSettings = document.getElementById('btn-settings');
}

/**
 * Attach event listeners
 */
function attachEventListeners() {
  elements.btnOpenDashboard.addEventListener('click', openDashboard);
  elements.btnSettings.addEventListener('click', openSettings);
}

/**
 * Load stats from service worker
 */
function loadStats() {
  chrome.runtime.sendMessage({ action: 'getStats' }, (response) => {
    if (response) {
      updateDisplay(response);
    }
  });
}

/**
 * Update the display with stats
 */
function updateDisplay(stats) {
  // Time
  const timeUsed = stats.totalWatchedTime || 0;
  const timeLimit = stats.timeLimit || D.TIME_LIMIT_MS;
  const timePercent = Math.min((timeUsed / timeLimit) * 100, 100);

  elements.timeCurrent.textContent = TL.formatTime(timeUsed);
  elements.timeLimit.textContent = TL.formatTime(timeLimit);
  elements.timeProgress.style.width = `${timePercent}%`;
  TL.updateProgressColor(elements.timeProgress, timePercent);

  // Shorts
  const shortsUsed = stats.totalWatchedShorts || 0;
  const shortsLimit = stats.shortsLimit || D.SHORTS_LIMIT;
  const shortsPercent = Math.min((shortsUsed / shortsLimit) * 100, 100);

  elements.shortsCurrent.textContent = shortsUsed;
  elements.shortsLimit.textContent = shortsLimit;
  elements.shortsProgress.style.width = `${shortsPercent}%`;
  TL.updateProgressColor(elements.shortsProgress, shortsPercent);

  // Videos
  elements.videosCount.textContent = stats.totalVideosWatched || 0;

  // Streaks
  elements.timeStreakValue.textContent = stats.timeStreak || 0;
  elements.shortsStreakValue.textContent = stats.shortsStreak || 0;

  // Streak broken states
  if (stats.timeStreakBrokenToday) {
    elements.timeStreakMini.classList.add('broken');
  } else {
    elements.timeStreakMini.classList.remove('broken');
  }

  if (stats.shortsStreakBrokenToday) {
    elements.shortsStreakMini.classList.add('broken');
  } else {
    elements.shortsStreakMini.classList.remove('broken');
  }
}

/**
 * Open the side panel dashboard
 */
async function openDashboard() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (tab) {
    await chrome.sidePanel.open({ tabId: tab.id });
    await chrome.sidePanel.setOptions({
      tabId: tab.id,
      path: 'sidepanelYtSummary.html',
      enabled: true
    });

    window.close();
  }
}

/**
 * Open the side panel to settings view
 */
async function openSettings() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (tab) {
    await chrome.storage.local.set({ [K.OPEN_TO_SETTINGS]: true });

    await chrome.sidePanel.open({ tabId: tab.id });
    await chrome.sidePanel.setOptions({
      tabId: tab.id,
      path: 'sidepanelYtSummary.html',
      enabled: true
    });

    window.close();
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
