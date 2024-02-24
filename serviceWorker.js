// Add totalWatchedShorts into local storage if it doesn't exist
chrome.storage.local.get(['totalWatchedShorts', 'lastRestTime'], function (result) {
  if (result.totalWatchedShorts === undefined) {
    chrome.storage.local.set({ totalWatchedShorts: 0 });
  }
  if (result.lastRestTime === undefined) {
    chrome.storage.local.set({ lastRestTime: Date.now() });
  }
});

chrome.storage.local.set({ totalWatchedShorts: 0 });
let debounceTimeout;

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
  if (message.action === 'timeLimitExceeded') {
    console.log('-You have reached your limit-V');
    // This will open a tab-specific side panel only on the current tab.
    await chrome.sidePanel.open({ tabId: message.data.tabId });
    await chrome.sidePanel.setOptions({
      tabId: message.data.tabId,
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

function isYouTubeVideoUrl(url) {
  return url.includes('youtube.com/watch');
}
