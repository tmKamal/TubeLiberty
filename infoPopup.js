document.addEventListener('DOMContentLoaded', function () {
  console.log('popup.js loaded');
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('message received', message);
    if (message.action === 'timeLimitExceeded') {
      document.getElementById('message').innerText = 'You exceeded the time limit!';
    }
  });
  document.getElementById('show').addEventListener('click', function () {
    // Your code to execute when the button is clicked goes here
    // For example, you can show something or perform some action
    // send message to service worker
    chrome.runtime.sendMessage({ action: 'timeLimitExceeded' });
    console.log('Button clicked!');
  });
});
