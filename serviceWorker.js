const watchTimeCheckInterval = 10 * 1000; // 10 seconds
const currentDate = new Date().toDateString();
let debounceTimeout;
let startTime;

// Add totalWatchedShorts into local storage if it doesn't exist
chrome.storage.local.get(
  ['totalWatchedShorts', 'totalWatchedTime', 'lastRestTime', 'lastOpenedDate'],
  function (result) {
    if (result.totalWatchedShorts === undefined) {
      chrome.storage.local.set({ totalWatchedShorts: 0 });
    }
    if (result.lastRestTime === undefined) {
      chrome.storage.local.set({ lastRestTime: Date.now() });
    }
    if (result.totalWatchedTime === undefined) {
      chrome.storage.local.set({ totalWatchedTime: 0 });
    }
    if (result.lastOpenedDate === undefined) {
      chrome.storage.local.set({ lastOpenedDate: new Date().toDateString() });
    } else {
      checkAndresetValuesOnNewDay(result.lastOpenedDate);
    }
  }
);

function checkAndresetValuesOnNewDay(lastOpenedDate) {
  console.log('checking if a new day has started..');
  // If the dates are different, it means a new day has started
  if (lastOpenedDate !== currentDate) {
    console.log('New day has started');
    // Reset the values
    chrome.storage.local.set({
      totalWatchTime: 0,
      showShortBanner: false,
      showTimeBanner: false,
      lastOpenedDate: currentDate, // Update the last opened date
    });
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url.includes('youtube.com/shorts')) {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      incrementWatchedShorts(tab);
    }, 1000); // Wait for 1 second before calling incrementWatchedShorts
  }
});

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  console.log('message received', message);
  console.log('sender', sender);
  if (message.action === 'openSideBar') {
    console.log('-You have reached your limit-V');
    // This will open a tab-specific side panel only on the current tab.
    await chrome.sidePanel.open({ tabId: sender.tab.id });
    await chrome.sidePanel.setOptions({
      tabId: sender.tab.id,
      path: 'sidepanelYtSummary.html',
      enabled: true,
    });
  }
});

function redirectToHomePageAndNotify(tabId, type) {
  console.log('redirecting to homepage');
  if (type === 'shorts') {
    chrome.storage.local.set({ showShortBanner: true });
    actionType = 'shortsLimitExceeded';
  } else {
    chrome.storage.local.set({ showTimeBanner: true });
    actionType = 'timeLimitExceeded';
  }
  // redirect to youtube homepage
  chrome.tabs.update(tabId, { url: 'https://www.youtube.com/' });
}

function incrementWatchedShorts(tab) {
  // Get the current value
  chrome.storage.local.get(['totalWatchedShorts', 'lastRestTime'], async function (result) {
    // Increment the value
    console.log('locla storage', result.totalWatchedShorts);
    let totalWatchedShorts = result.totalWatchedShorts + 1;
    let lastRestTime = result.lastRestTime;

    // If the user has watched 5 shorts, check if 2 hours have passed since the last rest
    if (totalWatchedShorts > 5) {
      const currentTime = Date.now();
      const timeDifference = currentTime - lastRestTime;
      const timeDifferenceInHours = timeDifference / 1000 / 60 / 60;
      console.log('timeDifferenceInHours', timeDifferenceInHours);
      if (timeDifferenceInHours > 2) {
        console.log('Watchable shorts counts for the last 2 hours have exceeded.');
        redirectToHomePageAndNotify(tab.id);
        return;
      } else {
        console.log('Watchable shorts count have not exceeded yet.');
        chrome.storage.local.set({ lastRestTime: currentTime });
        totalWatchedShorts = 1;
      }
    }

    // Save the new short count
    chrome.storage.local.set({ totalWatchedShorts: totalWatchedShorts });
  });
}

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  // If the user is watching a regular video
  if (tab.url.includes('watch?v=')) {
    console.log('watching a regular video');
    if (changeInfo.status === 'loading') {
      // The video has started loading, record the start time
      startTime = Date.now();
      checkTotalWatchTime(tabId);
    } else if ((changeInfo.status === 'complete' || changeInfo.url) && startTime) {
      // The video has finished loading or the URL has changed, calculate the watch time
      const watchTime = Date.now() - startTime;
      // Get the current total watch time
      chrome.storage.local.get(['totalWatchTime'], function (result) {
        console.log('totalWatchedTime', result);
        let totalWatchTime = result.totalWatchTime || 0;
        // Add the watch time to the total watch time
        totalWatchTime += watchTime;
        // Save the new total watch time
        chrome.storage.local.set({ totalWatchTime: totalWatchTime });
      });
      // Reset the start time
      startTime = null;
    }
  }
});

function isYouTubeVideoUrl(url) {
  return url.includes('youtube.com/watch');
}

function checkTotalWatchTime(tabId) {
  chrome.tabs.get(tabId, function (tab) {
    if (isYouTubeVideoUrl(tab.url)) {
      // The user is watching a regular video, increment the total watch time by 10 seconds
      chrome.storage.local.get(['totalWatchTime'], function (result) {
        let totalWatchTime = result.totalWatchTime || 0;
        totalWatchTime += watchTimeCheckInterval; // Add 10 seconds to the total watch time
        chrome.storage.local.set({ totalWatchTime: totalWatchTime });

        // If the total watch time exceeds 1 minutes, redirect to the YouTube homepage
        console.log('lets check::', totalWatchTime);
        if (totalWatchTime > 3 * 60 * 1000) {
          redirectToHomePageAndNotify(tabId, 'time');
        }
      });
    }
  });
}

// Check the total watch time every 10 seconds
setInterval(function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    console.log('checking total watch time 10 seconds later..', tabs);
    if (tabs.length === 0) return;
    checkTotalWatchTime(tabs[0].id);
  });
}, watchTimeCheckInterval);
