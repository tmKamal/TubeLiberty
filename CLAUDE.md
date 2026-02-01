# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TubeLiberty is a Chrome Extension (Manifest V3) for managing YouTube screen time. It limits daily watch time (default: 3 minutes) and restricts shorts consumption (default: 5 per 2-hour period), tracks streaks, and provides a dashboard for habit monitoring.

## Philosophy (see `docs/PHILOSOPHY.md` for full details)

**Core principle:** Limits are boundaries to prevent doom scrolling, NOT goals to achieve. Staying WITHIN limits is the real win.

**Two types of content with different treatment:**
- **Videos** - Can be valuable (tutorials, educational). Users can **whitelist a specific video** to finish it without breaking their streak.
- **Shorts** - Almost never valuable, engineered to be addictive. NO whitelist option. Harsh commitment messages to discourage extending.

**Streak system:** Two separate streaks (time control, shorts control). Streaks only break when user requests MORE time/shorts, not when they hit limits. Whitelisting a video does NOT break the streak.

**Commitment messages:** Users must type a phrase exactly to confirm limit increases. Videos get moderate tone, shorts get intentionally harsh tone to create psychological friction.

**User flows when limit exceeded:**
1. User is redirected to YouTube homepage
2. Modal appears with options: Whitelist (videos only), Request More (breaks streak), Accept & Leave
3. `lastBlockedVideoUrl` is saved so whitelist option works even after redirect

## Development

**No build system** - This is a direct-load Chrome extension with no dependencies, bundler, or package manager.

**Loading the extension:**
1. Navigate to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" and select this directory
4. Reload after changes

**Code formatting:** Prettier via VS Code (format on save enabled in `.vscode/settings.json`)

## Architecture

```
serviceWorker.js    → Background service worker (central state, limit enforcement, streak logic)
contentScript.js    → Injected into YouTube pages (modal banners, user interactions)
sidepanel.js        → Dashboard UI (history, stats, streaks)
infoPopup.js        → Toolbar popup (quick stats)
script.js           → Onboarding flow (4-step welcome)
```

**State Management:** All state flows through `chrome.storage.local`. UI components communicate via `chrome.runtime.sendMessage({ action: 'getStats' })` and the service worker responds with current stats.

**Key storage keys:**
- Usage: `totalWatchedTime`, `totalWatchedShorts`, `totalVideosWatched`
- Limits: `timeLimit`, `shortsLimit`
- Streaks: `timeStreak`, `shortsStreak`, `lastTimeStreakDate`, `lastShortsStreakDate`
- History: `history` (array of last 7 days with date, time, shorts, videos)
- UI flags: `showTimeBanner`, `showShortBanner`, `whitelistedVideoUrl`, `lastBlockedVideoUrl`

**Configuration constants** (top of `serviceWorker.js`):
```javascript
WATCH_TIME_CHECK_INTERVAL = 10 * 1000  // 10 seconds
TIME_LIMIT_MS = 3 * 60 * 1000          // 3 minutes
SHORTS_LIMIT = 5
SHORTS_PERIOD_HOURS = 2
EXTRA_TIME_MS = 5 * 60 * 1000          // 5 minutes
EXTRA_SHORTS = 3
```

## Code Patterns

**Element caching:** Components cache DOM elements in objects at initialization
```javascript
const elements = { ... };
function cacheElements() { elements.x = document.getElementById(...); }
```

**Progress coloring:** Three-state system (safe/warning/danger at 70%/90% thresholds)

**CSS design system:** `common.css` contains custom properties for colors, typography, and spacing. Uses neutral 50-900 palette and status colors (success/warning/danger).

## Chrome Extension Permissions

- `storage`, `scripting`, `activeTab`, `tabs`, `notifications`, `sidePanel`
- Host: `https://*.youtube.com/*`
