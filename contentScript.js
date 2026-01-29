/**
 * TubeLiberty Content Script
 * Injects banners when limits are exceeded
 */

(function() {
  'use strict';

  console.log('TubeLiberty content script loaded');

  let currentBanner = null;

  /**
   * Get the current video URL if on a watch page
   */
  function getCurrentVideoUrl() {
    if (window.location.href.includes('watch?v=')) {
      return window.location.href;
    }
    return null;
  }

  /**
   * Create the time limit exceeded banner
   */
  function createTimeBanner() {
    const videoUrl = getCurrentVideoUrl();

    const banner = document.createElement('div');
    banner.id = 'tubeliberty-banner';
    banner.className = 'tubeliberty-modal-backdrop';
    banner.innerHTML = `
      <div class="tubeliberty-modal">
        <div class="tubeliberty-modal-icon">⏱️</div>
        <h2 class="tubeliberty-modal-title">Time Limit Reached</h2>
        <p class="tubeliberty-modal-description">
          You've used your daily YouTube time.
          Take a break and come back tomorrow.
        </p>

        ${videoUrl ? `
        <div class="tubeliberty-option-card tubeliberty-option-whitelist">
          <div class="tubeliberty-option-header">
            <span class="tubeliberty-option-icon">🎬</span>
            <span class="tubeliberty-option-label">Watching something important?</span>
          </div>
          <button class="tubeliberty-btn tubeliberty-btn-primary" id="tubeliberty-whitelist-btn">
            Whitelist This Video
          </button>
          <p class="tubeliberty-option-hint">
            Finish this video without breaking your streak
          </p>
        </div>
        ` : ''}

        <div class="tubeliberty-option-card tubeliberty-option-increase">
          <div class="tubeliberty-option-header">
            <span class="tubeliberty-option-icon">⚠️</span>
            <span class="tubeliberty-option-label">Need more time in general?</span>
          </div>
          <button class="tubeliberty-btn tubeliberty-btn-secondary" id="tubeliberty-increase-time-btn">
            Request More Time
          </button>
          <p class="tubeliberty-option-hint tubeliberty-warning-text">
            This will break your streak
          </p>
        </div>

        <button class="tubeliberty-btn tubeliberty-btn-ghost" id="tubeliberty-accept-btn">
          Accept & Leave YouTube
        </button>

        <p class="tubeliberty-modal-footer">
          Limits reset at midnight
        </p>
      </div>
    `;

    return banner;
  }

  /**
   * Create the shorts limit exceeded banner
   */
  function createShortsBanner() {
    const banner = document.createElement('div');
    banner.id = 'tubeliberty-banner';
    banner.className = 'tubeliberty-modal-backdrop';
    banner.innerHTML = `
      <div class="tubeliberty-modal">
        <div class="tubeliberty-modal-icon">📱</div>
        <h2 class="tubeliberty-modal-title">Shorts Limit Reached</h2>
        <p class="tubeliberty-modal-description">
          You've watched your limit of shorts.
          That's enough mindless scrolling for now.
        </p>

        <div class="tubeliberty-info-box">
          <p>💡 Shorts are designed to waste your time.</p>
          <p>Every one you skip is a small victory.</p>
        </div>

        <div class="tubeliberty-option-card tubeliberty-option-danger">
          <button class="tubeliberty-btn tubeliberty-btn-secondary" id="tubeliberty-increase-shorts-btn">
            Request More Shorts
          </button>
          <p class="tubeliberty-option-hint tubeliberty-warning-text">
            This will break your streak
          </p>
        </div>

        <button class="tubeliberty-btn tubeliberty-btn-primary" id="tubeliberty-accept-btn">
          Accept & Leave
        </button>
        <p class="tubeliberty-recommended">(Recommended)</p>

        <p class="tubeliberty-modal-footer">
          Shorts limit resets every 2 hours
        </p>
      </div>
    `;

    return banner;
  }

  /**
   * Create whitelisted confirmation banner
   */
  function createWhitelistedBanner() {
    const banner = document.createElement('div');
    banner.id = 'tubeliberty-banner';
    banner.className = 'tubeliberty-modal-backdrop';
    banner.innerHTML = `
      <div class="tubeliberty-modal tubeliberty-modal-success">
        <div class="tubeliberty-modal-icon">✅</div>
        <h2 class="tubeliberty-modal-title">Video Whitelisted</h2>
        <p class="tubeliberty-modal-description">
          You can finish watching this video.
          This won't break your streak.
        </p>
        <p class="tubeliberty-modal-note">
          After this video, your limit resumes.
        </p>
        <button class="tubeliberty-btn tubeliberty-btn-primary" id="tubeliberty-continue-btn">
          Continue Watching
        </button>
      </div>
    `;

    return banner;
  }

  /**
   * Show a banner
   */
  function showBanner(type) {
    // Remove existing banner
    removeBanner();

    let banner;
    if (type === 'time') {
      banner = createTimeBanner();
    } else if (type === 'shorts') {
      banner = createShortsBanner();
    } else if (type === 'whitelisted') {
      banner = createWhitelistedBanner();
    }

    if (!banner) return;

    document.body.appendChild(banner);
    currentBanner = banner;

    // Attach event listeners
    attachBannerListeners(type);

    // Animate in
    requestAnimationFrame(() => {
      banner.classList.add('visible');
    });
  }

  /**
   * Remove the banner
   */
  function removeBanner() {
    if (currentBanner) {
      currentBanner.remove();
      currentBanner = null;
    }

    const existingBanner = document.getElementById('tubeliberty-banner');
    if (existingBanner) {
      existingBanner.remove();
    }
  }

  /**
   * Attach event listeners to banner buttons
   */
  function attachBannerListeners(type) {
    // Whitelist button (time banner only)
    const whitelistBtn = document.getElementById('tubeliberty-whitelist-btn');
    if (whitelistBtn) {
      whitelistBtn.addEventListener('click', handleWhitelist);
    }

    // Increase time button
    const increaseTimeBtn = document.getElementById('tubeliberty-increase-time-btn');
    if (increaseTimeBtn) {
      increaseTimeBtn.addEventListener('click', handleOpenSidePanel);
    }

    // Increase shorts button
    const increaseShortsBtn = document.getElementById('tubeliberty-increase-shorts-btn');
    if (increaseShortsBtn) {
      increaseShortsBtn.addEventListener('click', handleOpenSidePanel);
    }

    // Accept button
    const acceptBtn = document.getElementById('tubeliberty-accept-btn');
    if (acceptBtn) {
      acceptBtn.addEventListener('click', handleAccept);
    }

    // Continue button (whitelisted banner)
    const continueBtn = document.getElementById('tubeliberty-continue-btn');
    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        removeBanner();
      });
    }
  }

  /**
   * Handle whitelist button click
   */
  function handleWhitelist() {
    const videoUrl = getCurrentVideoUrl();
    if (!videoUrl) return;

    chrome.runtime.sendMessage(
      { action: 'whitelistVideo', videoUrl: videoUrl },
      (response) => {
        if (response?.success) {
          showBanner('whitelisted');
        }
      }
    );
  }

  /**
   * Handle open side panel
   */
  function handleOpenSidePanel() {
    chrome.runtime.sendMessage({ action: 'openSideBar' });
    removeBanner();
  }

  /**
   * Handle accept button
   */
  function handleAccept() {
    // Clear banner flags and stay on YouTube homepage
    chrome.storage.local.set({
      showTimeBanner: false,
      showShortBanner: false
    });
    removeBanner();
  }

  /**
   * Check storage and show appropriate banner
   */
  function checkAndShowBanner() {
    chrome.storage.local.get(['showShortBanner', 'showTimeBanner'], (result) => {
      if (result.showTimeBanner === true) {
        showBanner('time');
      } else if (result.showShortBanner === true) {
        showBanner('shorts');
      }
    });
  }

  /**
   * Inject styles
   */
  function injectStyles() {
    if (document.getElementById('tubeliberty-styles')) return;

    const link = document.createElement('link');
    link.id = 'tubeliberty-styles';
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('styles.css');
    document.head.appendChild(link);
  }

  // Initialize
  injectStyles();
  checkAndShowBanner();

  // Listen for storage changes
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      if (changes.showTimeBanner?.newValue === true) {
        showBanner('time');
      } else if (changes.showShortBanner?.newValue === true) {
        showBanner('shorts');
      } else if (changes.showTimeBanner?.newValue === false && changes.showShortBanner?.newValue === false) {
        removeBanner();
      }
    }
  });
})();
