// content.js
(function () {
  'use strict';

  console.log('Loding Contentscript..');

  function createBanner() {
    console.log('we are creating the banner');
    var customBanner = document.createElement('div');
    customBanner.id = 'custom-banner';
    customBanner.innerHTML = `
            <div class="message">Oops! It seems you've reached your current time limit for this session.</br>
            Remember, it's best not to manually lift the limit yourself. It will automatically get lifted after couple of hours.</div>
            <button id="open-settings-btn">Reset Limits Manually</button>
            <button id="close-banner-btn">Close</button>
        `;
    document.body.appendChild(customBanner);

    document.getElementById('open-settings-btn').addEventListener('click', function () {
      console.log('Settings button clicked!');
      // Send the message along with tab details
      chrome.runtime.sendMessage({ action: 'openSideBar' }, function (response) {
        console.log('final-response', response);
      });
    });

    document.getElementById('close-banner-btn').addEventListener('click', function () {
      console.log('Close button clicked!');
      customBanner.style.display = 'none';
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
