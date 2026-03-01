/**
 * TubeLiberty Shared Constants
 * Single source of truth for all constants, storage keys, and URL helpers
 */

// eslint-disable-next-line no-unused-vars
const TL = {
  // --- Time conversion helpers ---
  MS_PER_SECOND: 1000,
  MS_PER_MINUTE: 60 * 1000,
  MS_PER_HOUR: 60 * 60 * 1000,

  // --- Default limits ---
  defaults: Object.freeze({
    TIME_LIMIT_MS: 3 * 60 * 1000,       // 3 minutes
    SHORTS_LIMIT: 5,
    SHORTS_PERIOD_HOURS: 2,
    EXTRA_TIME_MS: 5 * 60 * 1000,       // 5 minutes
    EXTRA_SHORTS: 3,
    WATCH_TIME_CHECK_INTERVAL: 10 * 1000, // 10 seconds
  }),

  // --- Storage key strings ---
  keys: Object.freeze({
    // Usage tracking
    TOTAL_WATCHED_TIME: 'totalWatchedTime',
    TOTAL_WATCHED_SHORTS: 'totalWatchedShorts',
    TOTAL_VIDEOS_WATCHED: 'totalVideosWatched',
    LAST_REST_TIME: 'lastRestTime',
    LAST_OPENED_DATE: 'lastOpenedDate',
    LAST_VIDEO_URL: 'lastVideoUrl',

    // Configured limits (user preferences)
    CONFIG_TIME_LIMIT: 'configTimeLimit',
    CONFIG_SHORTS_LIMIT: 'configShortsLimit',
    CONFIG_SHORTS_PERIOD_HOURS: 'configShortsPeriodHours',
    CONFIG_EXTRA_TIME: 'configExtraTime',
    CONFIG_EXTRA_SHORTS: 'configExtraShorts',

    // Active limits (may be increased during the day)
    TIME_LIMIT: 'timeLimit',
    SHORTS_LIMIT: 'shortsLimit',

    // Banner / UI state
    SHOW_TIME_BANNER: 'showTimeBanner',
    SHOW_SHORT_BANNER: 'showShortBanner',
    WHITELISTED_VIDEO_URL: 'whitelistedVideoUrl',
    LAST_BLOCKED_VIDEO_URL: 'lastBlockedVideoUrl',

    // Streaks
    TIME_STREAK: 'timeStreak',
    SHORTS_STREAK: 'shortsStreak',
    LAST_TIME_STREAK_DATE: 'lastTimeStreakDate',
    LAST_SHORTS_STREAK_DATE: 'lastShortsStreakDate',
    TIME_STREAK_BROKEN_TODAY: 'timeStreakBrokenToday',
    SHORTS_STREAK_BROKEN_TODAY: 'shortsStreakBrokenToday',

    // History
    HISTORY: 'history',

    // Misc
    ONBOARDING_COMPLETE: 'onboardingComplete',
    OPEN_TO_SETTINGS: 'openToSettings',
  }),

  // --- UI thresholds ---
  thresholds: Object.freeze({
    WARNING_PERCENT: 70,
    DANGER_PERCENT: 90,
  }),

  // --- UI timing ---
  timing: Object.freeze({
    TOAST_DURATION_MS: 3000,
    STATS_REFRESH_MS: 5000,
    SHORTS_DEBOUNCE_MS: 1000,
  }),

  // --- Alarm names ---
  alarms: Object.freeze({
    CHECK_WATCH_TIME: 'checkWatchTime',
  }),

  // --- URL helpers ---
  urls: Object.freeze({
    YOUTUBE_HOME: 'https://www.youtube.com/',

    isYouTube(url) {
      return url && url.includes('youtube.com');
    },

    isWatch(url) {
      return url && url.includes('youtube.com/watch');
    },

    isShorts(url) {
      return url && url.includes('youtube.com/shorts');
    },

    getVideoId(url) {
      if (!url) return null;
      const match = url.match(/[?&]v=([^&]+)/);
      return match ? match[1] : null;
    },
  }),

  // --- Settings validation ranges ---
  validation: Object.freeze({
    TIME_LIMIT_MIN: 1,
    TIME_LIMIT_MAX: 720,
    SHORTS_LIMIT_MIN: 1,
    SHORTS_LIMIT_MAX: 50,
    SHORTS_PERIOD_MIN: 1,
    SHORTS_PERIOD_MAX: 24,
    EXTRA_TIME_MIN: 1,
    EXTRA_TIME_MAX: 30,
    EXTRA_SHORTS_MIN: 1,
    EXTRA_SHORTS_MAX: 20,
  }),
};
