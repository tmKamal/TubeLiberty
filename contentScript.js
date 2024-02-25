// content.js
(function () {
  'use strict';

  console.log('Loding Contentscript..');

  function createBanner() {
    console.log('we are creating the banner');
    var customBanner = document.createElement('div');
    customBanner.id = 'custom-banner';
    customBanner.innerHTML = `
            <div class="message">Oops! You have exceeded your daily time limit on YouTube.</div>
            <button id="open-settings-btn">Open Settings</button>
        `;
    document.body.appendChild(customBanner);

    document.getElementById('open-settings-btn').addEventListener('click', function () {
      console.log('Settings button clicked!');
      // Send the message along with tab details
      chrome.runtime.sendMessage({ action: 'openSideBar' }, function (response) {
        console.log('final-response', response);
      });
    });
  }

  chrome.storage.local.get(['showShortBanner', 'showTimeBanner'], function (result) {
    if (result.showShortBanner === true) {
      createBanner();
    }
    if (result.showTimeBanner === true) {
      createBanner();
    }
  });
})();
