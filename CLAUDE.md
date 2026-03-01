# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TubeLiberty is a Chrome Extension (Manifest V3) for managing YouTube screen time. It limits daily watch time (default: 3 minutes) and restricts shorts consumption (default: 5 per 2-hour period), tracks streaks, and provides a dashboard for habit monitoring.

## Philosophy (see `dev-docs/PHILOSOPHY.md` for full details)

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
shared/constants.js → Shared constants, storage keys, URL helpers (TL object)
shared/utils.js     → Shared utility functions (TL.formatTime, TL.updateProgressColor)
serviceWorker.js    → Background service worker (central state, limit enforcement, streak logic)
contentScript.js    → Injected into YouTube pages (modal banners, user interactions)
sidepanel.js        → Dashboard UI (history, stats, streaks, settings)
infoPopup.js        → Toolbar popup (quick stats)
script.js           → Onboarding flow (4-step welcome)
```

**Shared modules (`shared/`):** Constants and utilities are centralized in `shared/constants.js` (the `TL` object) and `shared/utils.js`. These are loaded via `<script>` tags in HTML files and `importScripts()` in the service worker. There is no build system — these are plain scripts sharing a global `TL` object.

**State Management:** All state flows through `chrome.storage.local`. UI components communicate via `chrome.runtime.sendMessage({ action: 'getStats' })` and the service worker responds with current stats.

**Key storage keys** (defined in `TL.keys` in `shared/constants.js`):
- Usage: `totalWatchedTime`, `totalWatchedShorts`, `totalVideosWatched`
- Config limits (saved preferences): `configTimeLimit`, `configShortsLimit`, `configShortsPeriodHours`, `configExtraTime`, `configExtraShorts`
- Active limits (today's enforced values): `timeLimit`, `shortsLimit`
- Streaks: `timeStreak`, `shortsStreak`, `lastTimeStreakDate`, `lastShortsStreakDate`
- History: `history` (array of last 7 days with date, time, shorts, videos)
- UI flags: `showTimeBanner`, `showShortBanner`, `whitelistedVideoUrl`, `lastBlockedVideoUrl`

**Configuration defaults** (in `TL.defaults` in `shared/constants.js`):
```javascript
WATCH_TIME_CHECK_INTERVAL = 10 * 1000  // 10 seconds
TIME_LIMIT_MS = 3 * 60 * 1000          // 3 minutes
SHORTS_LIMIT = 5
SHORTS_PERIOD_HOURS = 2
EXTRA_TIME_MS = 5 * 60 * 1000          // 5 minutes
EXTRA_SHORTS = 3
```

**Two-layer settings system (config vs active limits):**
Settings changes are intentionally delayed — they save to `config*` keys (e.g., `configTimeLimit`) but don't update the active `timeLimit` until the next daily reset. This is by design: it prevents users from impulsively increasing limits when they hit them mid-day. The UI shows a warning note when daily limit fields are modified.

## Code Patterns

**Element caching:** Components cache DOM elements in objects at initialization
```javascript
const elements = { ... };
function cacheElements() { elements.x = document.getElementById(...); }
```

**Progress coloring:** Three-state system (safe/warning/danger at 70%/90% thresholds)

**CSS design system:** `common.css` contains custom properties for colors, typography, and spacing. Uses neutral 50-900 palette and status colors (success/warning/danger).

## Critical Implementation Rules

**DO NOT use `Object.freeze()` on the `TL` object in `shared/constants.js`.** The `utils.js` file adds methods (`formatTime`, `updateProgressColor`) to `TL` after it's created. Freezing `TL` causes these assignments to silently fail in non-strict mode, breaking all UI rendering. Nested sub-objects (`TL.keys`, `TL.defaults`, etc.) can safely use `Object.freeze()`.

**DO NOT replace `setInterval` with `chrome.alarms` for watch time tracking.** The `chrome.alarms` API has a minimum period of 30 seconds, which is too coarse for 10-second time tracking. The `setInterval` approach in the service worker is correct and necessary for accurate usage tracking.

**Always save updated counts BEFORE redirecting.** When a limit is exceeded (e.g., shorts count exceeds limit), the updated count must be saved to `chrome.storage.local` before calling `redirectToHomePageAndNotify`. The content script on the redirected page validates that limits are still exceeded before showing the banner modal. If the count isn't saved, validation fails and the modal won't appear.

## Chrome Extension Permissions

- `storage`, `scripting`, `activeTab`, `tabs`, `notifications`, `sidePanel`
- Host: `https://*.youtube.com/*`
