// Initialize totalWatchedShorts in storage
chrome.storage.local.set({ totalWatchedShorts: 0 });

function incrementWatchedShorts(tabUrl) {
  // Get the current value
  chrome.storage.local.get(['totalWatchedShorts'], function (result) {
    // Increment the value
    let totalWatchedShorts = result.totalWatchedShorts + 1;

    // Save the new value
    chrome.storage.local.set({ totalWatchedShorts: totalWatchedShorts });

    // If more than 2 shorts have been watched, redirect to YouTube
    if (totalWatchedShorts > 2) {
      // Create a notification with the URL of the short video
      console.log('You have reached your limit', tabUrl);
      /* chrome.notifications.create({
        type: 'basic',
        title: 'You have reached your limit',
        iconUrl: 'images/popup-128.png',
        message: `You have been redirected to YouTube's homepage. You can watch this short video later:`,
      }); */
      //window.location.href = 'https://www.youtube.com';
    }
  });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url.includes('youtube.com/shorts')) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: incrementWatchedShorts,
      args: [tab.url], // Pass the URL of the tab as an argument to incrementWatchedShorts
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('message received', message);
  if (message.action === 'timeLimitExceeded') {
    console.log('You have reached your limit');
    chrome.notifications.create('ss', {
      type: 'basic',
      title: 'You have reached your limit',
      iconUrl: 'images/popup-128.png',
      message: `You have been redirected to YouTube's homepage. You can watch this short video later:`,
    });
  }
});
