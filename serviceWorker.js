/**
 * TubeLiberty Service Worker
 * Manages YouTube usage limits, streaks, and history tracking
 */

importScripts('shared/constants.js', 'shared/utils.js');

const K = TL.keys;
const D = TL.defaults;

// State
let debounceTimeout;

/**
 * Initialize storage with default values
 */
async function initializeStorage() {
  const today = new Date().toDateString();

  try {
    const result = await chrome.storage.local.get(null);

    const defaults = {
      // Configurable settings (user preferences)
      [K.CONFIG_TIME_LIMIT]: D.TIME_LIMIT_MS,
      [K.CONFIG_SHORTS_LIMIT]: D.SHORTS_LIMIT,
      [K.CONFIG_SHORTS_PERIOD_HOURS]: D.SHORTS_PERIOD_HOURS,
      [K.CONFIG_EXTRA_TIME]: D.EXTRA_TIME_MS,
      [K.CONFIG_EXTRA_SHORTS]: D.EXTRA_SHORTS,

      // Usage tracking
      [K.TOTAL_WATCHED_SHORTS]: 0,
      [K.TOTAL_WATCHED_TIME]: 0,
      [K.TOTAL_VIDEOS_WATCHED]: 0,
      [K.LAST_REST_TIME]: Date.now(),
      [K.LAST_OPENED_DATE]: today,

      // Limits
      [K.TIME_LIMIT]: D.TIME_LIMIT_MS,
      [K.SHORTS_LIMIT]: D.SHORTS_LIMIT,

      // Banner states
      [K.SHOW_SHORT_BANNER]: false,
      [K.SHOW_TIME_BANNER]: false,

      // Whitelist
      [K.WHITELISTED_VIDEO_URL]: null,
      [K.LAST_BLOCKED_VIDEO_URL]: null,

      // Streaks
      [K.TIME_STREAK]: 0,
      [K.SHORTS_STREAK]: 0,
      [K.LAST_TIME_STREAK_DATE]: today,
      [K.LAST_SHORTS_STREAK_DATE]: today,
      [K.TIME_STREAK_BROKEN_TODAY]: false,
      [K.SHORTS_STREAK_BROKEN_TODAY]: false,

      // History (last 7 days)
      [K.HISTORY]: []
    };

    // Set defaults for any missing values
    const updates = {};
    for (const [key, value] of Object.entries(defaults)) {
      if (result[key] === undefined) {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length > 0) {
      await chrome.storage.local.set(updates);
    }

    // Check if it's a new day
    if (result[K.LAST_OPENED_DATE] && result[K.LAST_OPENED_DATE] !== today) {
      await handleNewDay(result);
    }
  } catch (err) {
    console.error('Failed to initialize storage:', err);
  }
}

/**
 * Handle transition to a new day (supports multi-day gaps).
 * If the user hasn't opened YouTube for several days, each missed day
 * gets a zero-usage history entry and counts as a perfect streak day.
 */
async function handleNewDay(previousData) {
  const today = new Date().toDateString();
  const lastDateStr = previousData[K.LAST_OPENED_DATE];

  // Mark today immediately so concurrent calls see the updated date and skip
  await chrome.storage.local.set({ [K.LAST_OPENED_DATE]: today });

  // Calculate how many days have passed
  const lastDate = new Date(lastDateStr);
  const todayDate = new Date(today);
  const diffDays = Math.round((todayDate - lastDate) / (24 * TL.MS_PER_HOUR));

  let history = previousData[K.HISTORY] || [];
  let timeStreak = previousData[K.TIME_STREAK] || 0;
  let shortsStreak = previousData[K.SHORTS_STREAK] || 0;

  // Day 0: the last active day — save its actual usage data
  history.unshift({
    date: lastDateStr,
    time: previousData[K.TOTAL_WATCHED_TIME] || 0,
    shorts: previousData[K.TOTAL_WATCHED_SHORTS] || 0,
    videos: previousData[K.TOTAL_VIDEOS_WATCHED] || 0
  });

  // Update streaks based on the last active day
  if (!previousData[K.TIME_STREAK_BROKEN_TODAY]) {
    timeStreak++;
  } else {
    timeStreak = 0;
  }

  if (!previousData[K.SHORTS_STREAK_BROKEN_TODAY]) {
    shortsStreak++;
  } else {
    shortsStreak = 0;
  }

  // Days 1..diffDays-1: missed days where user didn't use YouTube at all.
  // Not using YouTube = stayed within limits = perfect streak days.
  for (let i = 1; i < diffDays; i++) {
    const missedDate = new Date(lastDate);
    missedDate.setDate(missedDate.getDate() + i);

    history.unshift({
      date: missedDate.toDateString(),
      time: 0,
      shorts: 0,
      videos: 0
    });

    timeStreak++;
    shortsStreak++;
  }

  // Keep only last 7 days
  history = history.slice(0, 7);

  // Use configured defaults for new day limits
  const configTimeLimit = previousData[K.CONFIG_TIME_LIMIT] || D.TIME_LIMIT_MS;
  const configShortsLimit = previousData[K.CONFIG_SHORTS_LIMIT] || D.SHORTS_LIMIT;

  try {
    // Reset daily values
    await chrome.storage.local.set({
      [K.TOTAL_WATCHED_TIME]: 0,
      [K.TOTAL_WATCHED_SHORTS]: 0,
      [K.TOTAL_VIDEOS_WATCHED]: 0,
      [K.TIME_LIMIT]: configTimeLimit,
      [K.SHORTS_LIMIT]: configShortsLimit,
      [K.SHOW_SHORT_BANNER]: false,
      [K.SHOW_TIME_BANNER]: false,
      [K.WHITELISTED_VIDEO_URL]: null,
      [K.LAST_BLOCKED_VIDEO_URL]: null,
      [K.LAST_OPENED_DATE]: today,
      [K.LAST_REST_TIME]: Date.now(),
      [K.TIME_STREAK]: timeStreak,
      [K.SHORTS_STREAK]: shortsStreak,
      [K.LAST_TIME_STREAK_DATE]: today,
      [K.LAST_SHORTS_STREAK_DATE]: today,
      [K.TIME_STREAK_BROKEN_TODAY]: false,
      [K.SHORTS_STREAK_BROKEN_TODAY]: false,
      [K.HISTORY]: history
    });

    console.log(
      'New day started. Days elapsed:', diffDays,
      '| Streaks - Time:', timeStreak, 'Shorts:', shortsStreak
    );
  } catch (err) {
    console.error('Failed to handle new day:', err);
  }
}

// Initialize on service worker start
initializeStorage();

// Check for day change every minute via alarm
chrome.alarms.create('dayChangeCheck', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'dayChangeCheck') {
    await checkForNewDay();
  }
});

/**
 * Lightweight day change check — can be called frequently.
 * Safe to call multiple times; handleNewDay writes today's date first
 * so concurrent calls see the updated date and skip.
 */
async function checkForNewDay() {
  const today = new Date().toDateString();
  try {
    const result = await chrome.storage.local.get(null);
    if (result[K.LAST_OPENED_DATE] && result[K.LAST_OPENED_DATE] !== today) {
      await handleNewDay(result);
    }
  } catch (err) {
    console.error('Failed to check for new day:', err);
  }
}

/**
 * Redirect to YouTube homepage and set banner flag
 */
async function redirectToHomePageAndNotify(tabId, type, videoUrl = null) {
  console.log('Redirecting to homepage, type:', type);

  try {
    if (type === 'shorts') {
      await chrome.storage.local.set({ [K.SHOW_SHORT_BANNER]: true });
    } else {
      // Save the video URL so whitelist option can be shown on homepage
      await chrome.storage.local.set({
        [K.SHOW_TIME_BANNER]: true,
        [K.LAST_BLOCKED_VIDEO_URL]: videoUrl
      });
    }

    await chrome.tabs.update(tabId, { url: TL.urls.YOUTUBE_HOME });
  } catch (err) {
    console.error('Failed to redirect:', err);
  }
}

/**
 * Handle shorts watching
 */
async function incrementWatchedShorts(tab) {
  try {
    const result = await chrome.storage.local.get([
      K.TOTAL_WATCHED_SHORTS,
      K.LAST_REST_TIME,
      K.SHORTS_LIMIT,
      K.CONFIG_SHORTS_PERIOD_HOURS
    ]);

    let totalWatchedShorts = (result[K.TOTAL_WATCHED_SHORTS] || 0) + 1;
    const lastRestTime = result[K.LAST_REST_TIME] || Date.now();
    const shortsLimit = result[K.SHORTS_LIMIT] || D.SHORTS_LIMIT;
    const shortsPeriodHours = result[K.CONFIG_SHORTS_PERIOD_HOURS] || D.SHORTS_PERIOD_HOURS;

    // Check if shorts period has expired
    const currentTime = Date.now();
    const timeDifferenceHours = (currentTime - lastRestTime) / TL.MS_PER_HOUR;

    if (timeDifferenceHours > shortsPeriodHours) {
      // Reset the period
      await chrome.storage.local.set({
        [K.TOTAL_WATCHED_SHORTS]: 1,
        [K.LAST_REST_TIME]: currentTime
      });
      console.log('Shorts period reset. Starting fresh count.');
      return;
    }

    // Save the new count
    await chrome.storage.local.set({ [K.TOTAL_WATCHED_SHORTS]: totalWatchedShorts });

    // Check if limit exceeded
    if (totalWatchedShorts > shortsLimit) {
      console.log('Shorts limit exceeded:', totalWatchedShorts, '/', shortsLimit);
      await redirectToHomePageAndNotify(tab.id, 'shorts');
      return;
    }
    console.log('Shorts watched:', totalWatchedShorts, '/', shortsLimit);
  } catch (err) {
    console.error('Failed to increment shorts:', err);
  }
}

/**
 * Check if URL is a whitelisted video
 */
function isWhitelistedVideo(url, whitelistedUrl) {
  if (!whitelistedUrl || !url) return false;

  const currentVideoId = TL.urls.getVideoId(url);
  const whitelistedVideoId = TL.urls.getVideoId(whitelistedUrl);

  return currentVideoId && whitelistedVideoId && currentVideoId === whitelistedVideoId;
}

/**
 * Check total watch time and enforce limit
 */
async function checkTotalWatchTime(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.url || !TL.urls.isWatch(tab.url)) {
      return;
    }

    const result = await chrome.storage.local.get([
      K.TOTAL_WATCHED_TIME,
      K.TIME_LIMIT,
      K.WHITELISTED_VIDEO_URL
    ]);

    // Check if this video is whitelisted
    if (isWhitelistedVideo(tab.url, result[K.WHITELISTED_VIDEO_URL])) {
      console.log('Whitelisted video - not counting time');
      return;
    }

    const totalWatchTime = (result[K.TOTAL_WATCHED_TIME] || 0) + D.WATCH_TIME_CHECK_INTERVAL;
    const timeLimit = result[K.TIME_LIMIT] || D.TIME_LIMIT_MS;

    await chrome.storage.local.set({ [K.TOTAL_WATCHED_TIME]: totalWatchTime });

    // Check if limit exceeded
    if (totalWatchTime > timeLimit) {
      console.log('Time limit exceeded:', totalWatchTime, 'ms /', timeLimit, 'ms');
      await redirectToHomePageAndNotify(tabId, 'time', tab.url);
    }
  } catch (err) {
    // Tab may have been closed — that's normal
    if (!err.message?.includes('No tab')) {
      console.error('Failed to check watch time:', err);
    }
  }
}

/**
 * Increment video count when user starts watching a new video
 */
async function incrementVideoCount(videoUrl) {
  try {
    const result = await chrome.storage.local.get([K.TOTAL_VIDEOS_WATCHED, K.LAST_VIDEO_URL]);

    // Only count if it's a different video
    if (result[K.LAST_VIDEO_URL] !== videoUrl) {
      const count = (result[K.TOTAL_VIDEOS_WATCHED] || 0) + 1;
      await chrome.storage.local.set({
        [K.TOTAL_VIDEOS_WATCHED]: count,
        [K.LAST_VIDEO_URL]: videoUrl
      });
      console.log('Videos watched today:', count);
    }
  } catch (err) {
    console.error('Failed to increment video count:', err);
  }
}

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!tab.url || !TL.urls.isYouTube(tab.url)) {
    return;
  }

  // Handle shorts
  if (changeInfo.status === 'complete' && TL.urls.isShorts(tab.url)) {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      incrementWatchedShorts(tab);
    }, TL.timing.SHORTS_DEBOUNCE_MS);
  }

  // Handle regular videos
  if (tab.url.includes('watch?v=')) {
    if (changeInfo.status === 'loading') {
      incrementVideoCount(tab.url);
      checkTotalWatchTime(tabId);
    }
  }
});

// --- Watch time check interval ---
setInterval(function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs.length === 0) return;
    if (tabs[0].url && TL.urls.isWatch(tabs[0].url)) {
      checkTotalWatchTime(tabs[0].id);
    }
  });
}, D.WATCH_TIME_CHECK_INTERVAL);

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message.action);

  switch (message.action) {
    case 'openSideBar':
      handleOpenSideBar(sender.tab.id, message.context || 'general');
      break;

    case 'getStats':
      handleGetStats().then(sendResponse);
      return true; // Keep channel open for async response

    case 'getSettings':
      handleGetSettings().then(sendResponse);
      return true;

    case 'saveSettings':
      handleSaveSettings(message.settings).then(sendResponse);
      return true;

    case 'whitelistVideo':
      handleWhitelistVideo(message.videoUrl).then(sendResponse);
      return true;

    case 'increaseTimeLimit':
      handleIncreaseTimeLimit().then(sendResponse);
      return true;

    case 'increaseShortsLimit':
      handleIncreaseShortsLimit().then(sendResponse);
      return true;

    case 'resetAllLimits':
      handleResetAllLimits().then(sendResponse);
      return true;

    default:
      console.warn('Unknown message action:', message.action);
      break;
  }
});

/**
 * Open side panel with context
 */
async function handleOpenSideBar(tabId, context) {
  try {
    await chrome.sidePanel.open({ tabId: tabId });
    await chrome.sidePanel.setOptions({
      tabId: tabId,
      path: 'sidepanelYtSummary.html',
      enabled: true
    });
  } catch (err) {
    console.error('Failed to open side panel:', err);
  }
}

/**
 * Get current stats for display
 */
async function handleGetStats() {
  try {
    // Ensure day reset has happened before returning stats
    await checkForNewDay();

    const result = await chrome.storage.local.get(null);
    const shortsPeriodHours = result[K.CONFIG_SHORTS_PERIOD_HOURS] || D.SHORTS_PERIOD_HOURS;

    return {
      // Usage
      totalWatchedTime: result[K.TOTAL_WATCHED_TIME] || 0,
      totalWatchedShorts: result[K.TOTAL_WATCHED_SHORTS] || 0,
      totalVideosWatched: result[K.TOTAL_VIDEOS_WATCHED] || 0,

      // Limits
      timeLimit: result[K.TIME_LIMIT] || D.TIME_LIMIT_MS,
      shortsLimit: result[K.SHORTS_LIMIT] || D.SHORTS_LIMIT,

      // Time remaining in shorts period
      lastRestTime: result[K.LAST_REST_TIME] || Date.now(),
      shortsPeriodHours: shortsPeriodHours,

      // Streaks
      timeStreak: result[K.TIME_STREAK] || 0,
      shortsStreak: result[K.SHORTS_STREAK] || 0,
      timeStreakBrokenToday: result[K.TIME_STREAK_BROKEN_TODAY] || false,
      shortsStreakBrokenToday: result[K.SHORTS_STREAK_BROKEN_TODAY] || false,

      // Whitelist
      whitelistedVideoUrl: result[K.WHITELISTED_VIDEO_URL],

      // History
      history: result[K.HISTORY] || []
    };
  } catch (err) {
    console.error('Failed to get stats:', err);
    return {};
  }
}

/**
 * Get current settings
 */
async function handleGetSettings() {
  try {
    const result = await chrome.storage.local.get([
      K.CONFIG_TIME_LIMIT,
      K.CONFIG_SHORTS_LIMIT,
      K.CONFIG_SHORTS_PERIOD_HOURS,
      K.CONFIG_EXTRA_TIME,
      K.CONFIG_EXTRA_SHORTS
    ]);

    return {
      timeLimit: result[K.CONFIG_TIME_LIMIT] || D.TIME_LIMIT_MS,
      shortsLimit: result[K.CONFIG_SHORTS_LIMIT] || D.SHORTS_LIMIT,
      shortsPeriodHours: result[K.CONFIG_SHORTS_PERIOD_HOURS] || D.SHORTS_PERIOD_HOURS,
      extraTime: result[K.CONFIG_EXTRA_TIME] || D.EXTRA_TIME_MS,
      extraShorts: result[K.CONFIG_EXTRA_SHORTS] || D.EXTRA_SHORTS
    };
  } catch (err) {
    console.error('Failed to get settings:', err);
    return {};
  }
}

/**
 * Save settings
 */
async function handleSaveSettings(settings) {
  try {
    await chrome.storage.local.set({
      [K.CONFIG_TIME_LIMIT]: settings.timeLimit,
      [K.CONFIG_SHORTS_LIMIT]: settings.shortsLimit,
      [K.CONFIG_SHORTS_PERIOD_HOURS]: settings.shortsPeriodHours,
      [K.CONFIG_EXTRA_TIME]: settings.extraTime,
      [K.CONFIG_EXTRA_SHORTS]: settings.extraShorts
    });
    console.log('Settings saved:', settings);
    return { success: true };
  } catch (err) {
    console.error('Failed to save settings:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Whitelist a specific video URL
 */
async function handleWhitelistVideo(videoUrl) {
  try {
    await chrome.storage.local.set({
      [K.WHITELISTED_VIDEO_URL]: videoUrl,
      [K.SHOW_TIME_BANNER]: false,
      [K.LAST_BLOCKED_VIDEO_URL]: null
    });
    console.log('Video whitelisted:', videoUrl);
    return { success: true, videoUrl: videoUrl };
  } catch (err) {
    console.error('Failed to whitelist video:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Increase time limit (breaks streak)
 */
async function handleIncreaseTimeLimit() {
  try {
    const result = await chrome.storage.local.get([K.TIME_LIMIT, K.TIME_STREAK, K.CONFIG_EXTRA_TIME]);

    const extraTime = result[K.CONFIG_EXTRA_TIME] || D.EXTRA_TIME_MS;
    const newLimit = (result[K.TIME_LIMIT] || D.TIME_LIMIT_MS) + extraTime;

    await chrome.storage.local.set({
      [K.TIME_LIMIT]: newLimit,
      [K.SHOW_TIME_BANNER]: false,
      [K.LAST_BLOCKED_VIDEO_URL]: null,
      [K.TIME_STREAK_BROKEN_TODAY]: true,
      [K.TIME_STREAK]: 0 // Reset streak immediately
    });

    console.log('Time limit increased to:', newLimit, 'ms. Streak broken.');
    return {
      success: true,
      newLimit: newLimit,
      extraTime: extraTime,
      streakBroken: true
    };
  } catch (err) {
    console.error('Failed to increase time limit:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Increase shorts limit (breaks streak)
 */
async function handleIncreaseShortsLimit() {
  try {
    const result = await chrome.storage.local.get([K.SHORTS_LIMIT, K.SHORTS_STREAK, K.CONFIG_EXTRA_SHORTS]);

    const extraShorts = result[K.CONFIG_EXTRA_SHORTS] || D.EXTRA_SHORTS;
    const newLimit = (result[K.SHORTS_LIMIT] || D.SHORTS_LIMIT) + extraShorts;

    await chrome.storage.local.set({
      [K.SHORTS_LIMIT]: newLimit,
      [K.SHOW_SHORT_BANNER]: false,
      [K.SHORTS_STREAK_BROKEN_TODAY]: true,
      [K.SHORTS_STREAK]: 0 // Reset streak immediately
    });

    console.log('Shorts limit increased to:', newLimit, '. Streak broken.');
    return {
      success: true,
      newLimit: newLimit,
      extraShorts: extraShorts,
      streakBroken: true
    };
  } catch (err) {
    console.error('Failed to increase shorts limit:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Reset all limits (used for testing/debugging)
 */
async function handleResetAllLimits() {
  try {
    await chrome.storage.local.set({
      [K.TOTAL_WATCHED_TIME]: 0,
      [K.TOTAL_WATCHED_SHORTS]: 0,
      [K.TOTAL_VIDEOS_WATCHED]: 0,
      [K.TIME_LIMIT]: D.TIME_LIMIT_MS,
      [K.SHORTS_LIMIT]: D.SHORTS_LIMIT,
      [K.SHOW_TIME_BANNER]: false,
      [K.SHOW_SHORT_BANNER]: false,
      [K.WHITELISTED_VIDEO_URL]: null,
      [K.LAST_BLOCKED_VIDEO_URL]: null,
      [K.LAST_REST_TIME]: Date.now()
    });
    console.log('All limits reset');
    return { success: true };
  } catch (err) {
    console.error('Failed to reset limits:', err);
    return { success: false, error: err.message };
  }
}

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Open welcome page on first install
    chrome.tabs.create({ url: 'page.html' });
  }
});

console.log('TubeLiberty Service Worker initialized');
