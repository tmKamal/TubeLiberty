/**
 * TubeLiberty Content Script
 * Injects banners when limits are exceeded
 */

(function() {
  'use strict';

  const K = TL.keys;
  const D = TL.defaults;

  console.log('TubeLiberty content script loaded');

  let currentBanner = null;

  /**
   * Get the current video URL if on a watch page
   */
  function getCurrentVideoUrl() {
    if (TL.urls.isWatch(window.location.href)) {
      return window.location.href;
    }
    return null;
  }

  /**
   * Create the time limit exceeded banner
   */
  function createTimeBanner(savedVideoUrl = null) {
    // Use current video URL if on watch page, otherwise use saved URL from redirect
    const videoUrl = getCurrentVideoUrl() || savedVideoUrl;

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
   * Create whitelist confirmation banner (shown before whitelisting)
   */
  function createWhitelistConfirmBanner(videoUrl) {
    const banner = document.createElement('div');
    banner.id = 'tubeliberty-banner';
    banner.className = 'tubeliberty-modal-backdrop';
    banner.dataset.videoUrl = videoUrl;
    banner.innerHTML = `
      <div class="tubeliberty-modal">
        <div class="tubeliberty-modal-icon">🤔</div>
        <h2 class="tubeliberty-modal-title">Is this video truly important?</h2>
        <p class="tubeliberty-modal-description">
          Most videos feel valuable in the moment, but won't matter tomorrow.
          Will finishing this one actually help you?
        </p>

        <div class="tubeliberty-modal-actions">
          <button class="tubeliberty-btn tubeliberty-btn-primary" id="tubeliberty-confirm-whitelist-btn">
            Yes, It's Important
          </button>
          <button class="tubeliberty-btn tubeliberty-btn-ghost" id="tubeliberty-cancel-whitelist-btn">
            No, I'll Pass
          </button>
        </div>
      </div>
    `;

    return banner;
  }

  /**
   * Create whitelisted confirmation banner (shown after successful whitelist)
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
  function showBanner(type, savedVideoUrl = null) {
    // Remove existing banner
    removeBanner();

    let banner;
    if (type === 'time') {
      banner = createTimeBanner(savedVideoUrl);
    } else if (type === 'shorts') {
      banner = createShortsBanner();
    } else if (type === 'whitelisted') {
      banner = createWhitelistedBanner();
    } else if (type === 'whitelist-confirm') {
      banner = createWhitelistConfirmBanner(savedVideoUrl);
    }

    if (!banner) return;

    document.body.appendChild(banner);
    currentBanner = banner;

    // Attach event listeners
    attachBannerListeners(type, savedVideoUrl);

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
  function attachBannerListeners(type, savedVideoUrl = null) {
    // Whitelist button (time banner only)
    const whitelistBtn = document.getElementById('tubeliberty-whitelist-btn');
    if (whitelistBtn) {
      whitelistBtn.addEventListener('click', () => handleWhitelist(savedVideoUrl));
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

    // Confirm whitelist button (whitelist confirmation modal)
    const confirmWhitelistBtn = document.getElementById('tubeliberty-confirm-whitelist-btn');
    if (confirmWhitelistBtn) {
      confirmWhitelistBtn.addEventListener('click', () => {
        const videoUrl = currentBanner?.dataset?.videoUrl;
        handleConfirmWhitelist(videoUrl);
      });
    }

    // Cancel whitelist button (whitelist confirmation modal)
    const cancelWhitelistBtn = document.getElementById('tubeliberty-cancel-whitelist-btn');
    if (cancelWhitelistBtn) {
      cancelWhitelistBtn.addEventListener('click', () => {
        // Return to time limit modal
        showBanner('time', savedVideoUrl);
      });
    }
  }

  /**
   * Handle whitelist button click - shows confirmation modal
   */
  function handleWhitelist(savedVideoUrl = null) {
    const videoUrl = getCurrentVideoUrl() || savedVideoUrl;
    if (!videoUrl) return;

    // Show the confirmation modal instead of immediately whitelisting
    showBanner('whitelist-confirm', videoUrl);
  }

  /**
   * Handle confirmed whitelist - actually whitelists the video
   */
  async function handleConfirmWhitelist(videoUrl) {
    if (!videoUrl) return;

    try {
      const response = await chrome.runtime.sendMessage(
        { action: 'whitelistVideo', videoUrl: videoUrl }
      );

      if (response?.success) {
        // Clear the saved URL and redirect to the whitelisted video
        await chrome.storage.local.set({ [K.LAST_BLOCKED_VIDEO_URL]: null });
        window.location.href = videoUrl;
      }
    } catch (err) {
      console.error('Failed to whitelist video:', err);
    }
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
  async function handleAccept() {
    try {
      // Clear banner flags and saved URL, stay on YouTube homepage
      await chrome.storage.local.set({
        [K.SHOW_TIME_BANNER]: false,
        [K.SHOW_SHORT_BANNER]: false,
        [K.LAST_BLOCKED_VIDEO_URL]: null
      });
      removeBanner();
    } catch (err) {
      console.error('Failed to clear banner flags:', err);
      removeBanner();
    }
  }

  /**
   * Check storage and show appropriate banner
   */
  async function checkAndShowBanner() {
    try {
      const result = await chrome.storage.local.get([
        K.SHOW_SHORT_BANNER, K.SHOW_TIME_BANNER, K.LAST_BLOCKED_VIDEO_URL,
        K.LAST_OPENED_DATE, K.TOTAL_WATCHED_TIME, K.TIME_LIMIT,
        K.TOTAL_WATCHED_SHORTS, K.SHORTS_LIMIT, K.LAST_REST_TIME, K.CONFIG_SHORTS_PERIOD_HOURS
      ]);

      // Don't show stale banners from a previous day (service worker may not have reset yet)
      if (result[K.LAST_OPENED_DATE] && result[K.LAST_OPENED_DATE] !== new Date().toDateString()) {
        return;
      }

      // Validate that limits are actually still exceeded before showing banners
      if (result[K.SHOW_TIME_BANNER] === true) {
        const timeStillExceeded = (result[K.TOTAL_WATCHED_TIME] || 0) > (result[K.TIME_LIMIT] || 0);
        if (timeStillExceeded) {
          showBanner('time', result[K.LAST_BLOCKED_VIDEO_URL]);
        } else {
          await chrome.storage.local.set({ [K.SHOW_TIME_BANNER]: false, [K.LAST_BLOCKED_VIDEO_URL]: null });
        }
      } else if (result[K.SHOW_SHORT_BANNER] === true) {
        const periodHours = result[K.CONFIG_SHORTS_PERIOD_HOURS] || D.SHORTS_PERIOD_HOURS;
        const periodExpired = (Date.now() - (result[K.LAST_REST_TIME] || 0)) / TL.MS_PER_HOUR > periodHours;
        const shortsStillExceeded = !periodExpired && (result[K.TOTAL_WATCHED_SHORTS] || 0) > (result[K.SHORTS_LIMIT] || 0);
        if (shortsStillExceeded) {
          showBanner('shorts');
        } else {
          await chrome.storage.local.set({ [K.SHOW_SHORT_BANNER]: false });
        }
      }
    } catch (err) {
      console.error('Failed to check banner state:', err);
    }
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
  chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace === 'local') {
      if (changes[K.SHOW_TIME_BANNER]?.newValue === true) {
        try {
          // Fetch the saved video URL for whitelist option
          const result = await chrome.storage.local.get([K.LAST_BLOCKED_VIDEO_URL]);
          showBanner('time', result[K.LAST_BLOCKED_VIDEO_URL]);
        } catch (err) {
          console.error('Failed to fetch blocked video URL:', err);
          showBanner('time', null);
        }
      } else if (changes[K.SHOW_SHORT_BANNER]?.newValue === true) {
        showBanner('shorts');
      } else if (changes[K.SHOW_TIME_BANNER]?.newValue === false && changes[K.SHOW_SHORT_BANNER]?.newValue === false) {
        removeBanner();
      }
    }
  });
})();
