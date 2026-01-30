/**
 * TubeLiberty Service Worker
 * Manages YouTube usage limits, streaks, and history tracking
 */

// Constants
const WATCH_TIME_CHECK_INTERVAL = 10 * 1000; // 10 seconds
const TIME_LIMIT_MS = 3 * 60 * 1000; // 3 minutes in milliseconds
const SHORTS_LIMIT = 5;
const SHORTS_PERIOD_HOURS = 2;
const EXTRA_TIME_MS = 5 * 60 * 1000; // 5 minutes extra when increasing time
const EXTRA_SHORTS = 3; // 3 extra shorts when increasing

// State
let debounceTimeout;
let startTime;

/**
 * Initialize storage with default values
 */
function initializeStorage() {
  const today = new Date().toDateString();

  chrome.storage.local.get(null, function(result) {
    const defaults = {
      // Usage tracking
      totalWatchedShorts: 0,
      totalWatchedTime: 0,
      totalVideosWatched: 0,
      lastRestTime: Date.now(),
      lastOpenedDate: today,

      // Limits
      timeLimit: TIME_LIMIT_MS,
      shortsLimit: SHORTS_LIMIT,

      // Banner states
      showShortBanner: false,
      showTimeBanner: false,

      // Whitelist
      whitelistedVideoUrl: null,

      // Streaks
      timeStreak: 0,
      shortsStreak: 0,
      lastTimeStreakDate: today,
      lastShortsStreakDate: today,
      timeStreakBrokenToday: false,
      shortsStreakBrokenToday: false,

      // History (last 7 days)
      history: []
    };

    // Set defaults for any missing values
    const updates = {};
    for (const [key, value] of Object.entries(defaults)) {
      if (result[key] === undefined) {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length > 0) {
      chrome.storage.local.set(updates);
    }

    // Check if it's a new day
    if (result.lastOpenedDate && result.lastOpenedDate !== today) {
      handleNewDay(result);
    }
  });
}

/**
 * Handle transition to a new day
 */
function handleNewDay(previousData) {
  const today = new Date().toDateString();
  const yesterday = previousData.lastOpenedDate;

  // Save yesterday's data to history
  const historyEntry = {
    date: yesterday,
    time: previousData.totalWatchedTime || 0,
    shorts: previousData.totalWatchedShorts || 0,
    videos: previousData.totalVideosWatched || 0
  };

  let history = previousData.history || [];
  history.unshift(historyEntry);
  // Keep only last 7 days
  history = history.slice(0, 7);

  // Update streaks
  let timeStreak = previousData.timeStreak || 0;
  let shortsStreak = previousData.shortsStreak || 0;

  // If user didn't break their streak yesterday, increment it
  if (!previousData.timeStreakBrokenToday) {
    timeStreak++;
  } else {
    timeStreak = 0;
  }

  if (!previousData.shortsStreakBrokenToday) {
    shortsStreak++;
  } else {
    shortsStreak = 0;
  }

  // Reset daily values
  chrome.storage.local.set({
    totalWatchedTime: 0,
    totalWatchedShorts: 0,
    totalVideosWatched: 0,
    timeLimit: TIME_LIMIT_MS,
    shortsLimit: SHORTS_LIMIT,
    showShortBanner: false,
    showTimeBanner: false,
    whitelistedVideoUrl: null,
    lastOpenedDate: today,
    lastRestTime: Date.now(),
    timeStreak: timeStreak,
    shortsStreak: shortsStreak,
    lastTimeStreakDate: today,
    lastShortsStreakDate: today,
    timeStreakBrokenToday: false,
    shortsStreakBrokenToday: false,
    history: history
  });

  console.log('New day started. Streaks - Time:', timeStreak, 'Shorts:', shortsStreak);
}

// Initialize on service worker start
initializeStorage();

/**
 * Redirect to YouTube homepage and set banner flag
 */
function redirectToHomePageAndNotify(tabId, type) {
  console.log('Redirecting to homepage, type:', type);

  if (type === 'shorts') {
    chrome.storage.local.set({ showShortBanner: true });
  } else {
    chrome.storage.local.set({ showTimeBanner: true });
  }

  chrome.tabs.update(tabId, { url: 'https://www.youtube.com/' });
}

/**
 * Handle shorts watching
 */
function incrementWatchedShorts(tab) {
  chrome.storage.local.get([
    'totalWatchedShorts',
    'lastRestTime',
    'shortsLimit'
  ], function(result) {
    let totalWatchedShorts = (result.totalWatchedShorts || 0) + 1;
    const lastRestTime = result.lastRestTime || Date.now();
    const shortsLimit = result.shortsLimit || SHORTS_LIMIT;

    // Check if shorts period has expired (2 hours)
    const currentTime = Date.now();
    const timeDifferenceHours = (currentTime - lastRestTime) / 1000 / 60 / 60;

    if (timeDifferenceHours > SHORTS_PERIOD_HOURS) {
      // Reset the period
      totalWatchedShorts = 1;
      chrome.storage.local.set({
        totalWatchedShorts: 1,
        lastRestTime: currentTime
      });
      console.log('Shorts period reset. Starting fresh count.');
      return;
    }

    // Check if limit exceeded
    if (totalWatchedShorts > shortsLimit) {
      console.log('Shorts limit exceeded:', totalWatchedShorts, '/', shortsLimit);
      redirectToHomePageAndNotify(tab.id, 'shorts');
      return;
    }

    // Save the new count
    chrome.storage.local.set({ totalWatchedShorts: totalWatchedShorts });
    console.log('Shorts watched:', totalWatchedShorts, '/', shortsLimit);
  });
}

/**
 * Check if URL is a whitelisted video
 */
function isWhitelistedVideo(url, whitelistedUrl) {
  if (!whitelistedUrl || !url) return false;

  // Extract video ID from both URLs
  const getVideoId = (u) => {
    const match = u.match(/[?&]v=([^&]+)/);
    return match ? match[1] : null;
  };

  const currentVideoId = getVideoId(url);
  const whitelistedVideoId = getVideoId(whitelistedUrl);

  return currentVideoId && whitelistedVideoId && currentVideoId === whitelistedVideoId;
}

/**
 * Check total watch time and enforce limit
 */
function checkTotalWatchTime(tabId) {
  chrome.tabs.get(tabId, function(tab) {
    if (chrome.runtime.lastError || !tab || !tab.url) {
      return;
    }

    if (!tab.url.includes('youtube.com/watch')) {
      return;
    }

    chrome.storage.local.get([
      'totalWatchedTime',
      'timeLimit',
      'whitelistedVideoUrl'
    ], function(result) {
      // Check if this video is whitelisted
      if (isWhitelistedVideo(tab.url, result.whitelistedVideoUrl)) {
        console.log('Whitelisted video - not counting time');
        return;
      }

      let totalWatchTime = (result.totalWatchedTime || 0) + WATCH_TIME_CHECK_INTERVAL;
      const timeLimit = result.timeLimit || TIME_LIMIT_MS;

      chrome.storage.local.set({ totalWatchedTime: totalWatchTime });

      // Check if limit exceeded
      if (totalWatchTime > timeLimit) {
        console.log('Time limit exceeded:', totalWatchTime, 'ms /', timeLimit, 'ms');
        redirectToHomePageAndNotify(tabId, 'time');
      }
    });
  });
}

/**
 * Increment video count when user starts watching a new video
 */
function incrementVideoCount(videoUrl) {
  chrome.storage.local.get(['totalVideosWatched', 'lastVideoUrl'], function(result) {
    // Only count if it's a different video
    if (result.lastVideoUrl !== videoUrl) {
      const count = (result.totalVideosWatched || 0) + 1;
      chrome.storage.local.set({
        totalVideosWatched: count,
        lastVideoUrl: videoUrl
      });
      console.log('Videos watched today:', count);
    }
  });
}

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!tab.url || !tab.url.includes('youtube.com')) {
    return;
  }

  // Handle shorts
  if (changeInfo.status === 'complete' && tab.url.includes('youtube.com/shorts')) {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      incrementWatchedShorts(tab);
    }, 1000);
  }

  // Handle regular videos
  if (tab.url.includes('watch?v=')) {
    if (changeInfo.status === 'loading') {
      startTime = Date.now();
      incrementVideoCount(tab.url);
      checkTotalWatchTime(tabId);
    }
  }
});

// Periodic time check
setInterval(function() {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (tabs.length === 0) return;
    if (tabs[0].url && tabs[0].url.includes('youtube.com/watch')) {
      checkTotalWatchTime(tabs[0].id);
    }
  });
}, WATCH_TIME_CHECK_INTERVAL);

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message.action);

  switch (message.action) {
    case 'openSideBar':
      handleOpenSideBar(sender.tab.id, message.context || 'general');
      break;

    case 'getStats':
      handleGetStats(sendResponse);
      return true; // Keep channel open for async response

    case 'whitelistVideo':
      handleWhitelistVideo(message.videoUrl, sendResponse);
      return true;

    case 'increaseTimeLimit':
      handleIncreaseTimeLimit(sendResponse);
      return true;

    case 'increaseShortsLimit':
      handleIncreaseShortsLimit(sendResponse);
      return true;

    case 'resetAllLimits':
      handleResetAllLimits(sendResponse);
      return true;
  }
});

/**
 * Open side panel with context
 */
async function handleOpenSideBar(tabId, context) {
  await chrome.sidePanel.open({ tabId: tabId });
  await chrome.sidePanel.setOptions({
    tabId: tabId,
    path: 'sidepanelYtSummary.html',
    enabled: true
  });
}

/**
 * Get current stats for display
 */
function handleGetStats(sendResponse) {
  chrome.storage.local.get(null, function(result) {
    const stats = {
      // Usage
      totalWatchedTime: result.totalWatchedTime || 0,
      totalWatchedShorts: result.totalWatchedShorts || 0,
      totalVideosWatched: result.totalVideosWatched || 0,

      // Limits
      timeLimit: result.timeLimit || TIME_LIMIT_MS,
      shortsLimit: result.shortsLimit || SHORTS_LIMIT,

      // Time remaining in shorts period
      lastRestTime: result.lastRestTime || Date.now(),
      shortsPeriodHours: SHORTS_PERIOD_HOURS,

      // Streaks
      timeStreak: result.timeStreak || 0,
      shortsStreak: result.shortsStreak || 0,
      timeStreakBrokenToday: result.timeStreakBrokenToday || false,
      shortsStreakBrokenToday: result.shortsStreakBrokenToday || false,

      // Whitelist
      whitelistedVideoUrl: result.whitelistedVideoUrl,

      // History
      history: result.history || []
    };

    sendResponse(stats);
  });
}

/**
 * Whitelist a specific video URL
 */
function handleWhitelistVideo(videoUrl, sendResponse) {
  chrome.storage.local.set({
    whitelistedVideoUrl: videoUrl,
    showTimeBanner: false
  }, function() {
    console.log('Video whitelisted:', videoUrl);
    sendResponse({ success: true, videoUrl: videoUrl });
  });
}

/**
 * Increase time limit (breaks streak)
 */
function handleIncreaseTimeLimit(sendResponse) {
  chrome.storage.local.get(['timeLimit', 'timeStreak'], function(result) {
    const newLimit = (result.timeLimit || TIME_LIMIT_MS) + EXTRA_TIME_MS;

    chrome.storage.local.set({
      timeLimit: newLimit,
      showTimeBanner: false,
      timeStreakBrokenToday: true,
      timeStreak: 0 // Reset streak immediately
    }, function() {
      console.log('Time limit increased to:', newLimit, 'ms. Streak broken.');
      sendResponse({
        success: true,
        newLimit: newLimit,
        streakBroken: true
      });
    });
  });
}

/**
 * Increase shorts limit (breaks streak)
 */
function handleIncreaseShortsLimit(sendResponse) {
  chrome.storage.local.get(['shortsLimit', 'shortsStreak'], function(result) {
    const newLimit = (result.shortsLimit || SHORTS_LIMIT) + EXTRA_SHORTS;

    chrome.storage.local.set({
      shortsLimit: newLimit,
      showShortBanner: false,
      shortsStreakBrokenToday: true,
      shortsStreak: 0 // Reset streak immediately
    }, function() {
      console.log('Shorts limit increased to:', newLimit, '. Streak broken.');
      sendResponse({
        success: true,
        newLimit: newLimit,
        streakBroken: true
      });
    });
  });
}

/**
 * Reset all limits (used for testing/debugging)
 */
function handleResetAllLimits(sendResponse) {
  chrome.storage.local.set({
    totalWatchedTime: 0,
    totalWatchedShorts: 0,
    totalVideosWatched: 0,
    timeLimit: TIME_LIMIT_MS,
    shortsLimit: SHORTS_LIMIT,
    showTimeBanner: false,
    showShortBanner: false,
    whitelistedVideoUrl: null,
    lastRestTime: Date.now()
  }, function() {
    console.log('All limits reset');
    sendResponse({ success: true });
  });
}

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Open welcome page on first install
    chrome.tabs.create({ url: 'page.html' });
  }
});

console.log('TubeLiberty Service Worker initialized');
