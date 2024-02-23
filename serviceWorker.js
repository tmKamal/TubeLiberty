// Initialize totalWatchedShorts in storage
chrome.storage.local.set({ totalWatchedShorts: 0 });

// Open a new tab with the page.html file when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log('onInstalled...');
  chrome.tabs.create({ url: 'page.html' });
});

function incrementWatchedShorts(tab) {
  // Get the current value
  chrome.storage.local.get(['totalWatchedShorts'], async function (result) {
    // Increment the value
    let totalWatchedShorts = result.totalWatchedShorts + 1;

    // Save the new value
    chrome.storage.local.set({ totalWatchedShorts: totalWatchedShorts });

    // If more than 2 shorts have been watched, redirect to YouTube
    if (totalWatchedShorts > 2) {
      // Create a notification with the URL of the short video
      // TODO: redirect to YouTube homepage
    }
  });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url.includes('youtube.com/shorts')) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: incrementWatchedShorts,
      args: [tab], // Pass the tab as an argument to incrementWatchedShorts
    });
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
