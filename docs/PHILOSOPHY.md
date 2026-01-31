# TubeLiberty - Project Philosophy & Documentation

## Overview

**TubeLiberty** is a Chrome extension designed to help users combat YouTube addiction and manage their viewing habits through automatic restrictions and psychological motivation barriers.

### Core Mission
Help users regain control of their time by setting boundaries on YouTube consumption and making it psychologically harder to exceed those boundaries.

---

## The Philosophy

### Fundamental Principle

> **Limits are boundaries to prevent doom scrolling, NOT goals to achieve.**
> **Staying WITHIN limits is the real win.**

This is the most important concept to understand. Unlike fitness apps where hitting a step goal is celebrated, TubeLiberty treats limits as guardrails. Hitting a limit means you've consumed enough - it's not an achievement, it's a warning sign.

### Why This Matters

When a user reaches their limit:
- We do NOT celebrate ("Great job watching 3 minutes!")
- We do NOT treat it as an accomplishment
- We present it neutrally: "You've reached your limit. Time for a break."

The WIN is when a user:
- Stays within their limits for the entire day
- Doesn't need to request more time/shorts
- Builds consecutive day streaks

---

## Two Types of Content

### 1. Regular Videos (Time-Limited)

**Philosophy:** Regular YouTube videos CAN be valuable (educational content, tutorials, documentaries). Users deserve some flexibility here.

**Implementation:**
- Daily time limit (default: 3 minutes)
- When limit is reached, user is redirected to YouTube homepage
- User can **whitelist a specific video** to finish watching it
- User can **request more time** (+5 minutes) but this breaks their streak

**Whitelist Feature:**
- Purpose: Allow users to finish valuable content
- Does NOT break the streak
- Only applies to the specific video being watched
- One-time use (video must be finished in that session)

### 2. Shorts (Count-Limited)

**Philosophy:** Shorts are almost NEVER valuable. They are engineered to be addictive, provide zero lasting value, and are the purest form of doom scrolling. We are HARSH about shorts.

**Implementation:**
- Shorts limit per 2-hour period (default: 5 shorts)
- When limit is reached, user is redirected to YouTube homepage
- NO whitelist option for shorts (they're never "important")
- User can request more shorts (+3) but this breaks their streak
- Commitment messages for shorts are intentionally HARSH

**Why Harsh?**
When a user tries to increase their shorts limit, we make them type messages like:
- "I am wasting my life on content that does not matter"
- "I choose mindless scrolling over meaningful activities"
- "I am feeding my addiction instead of fighting it"

This psychological friction makes users think twice before giving in.

---

## Streak System

### Two Separate Streaks

1. **Time Control Streak**
   - Counts consecutive days without requesting more video time
   - Whitelisting a video does NOT break this streak
   - Only breaks if user clicks "Request More Time" and confirms

2. **Shorts Control Streak**
   - Counts consecutive days without requesting more shorts
   - Breaks if user clicks "Request More Shorts" and confirms

### Streak Psychology

Streaks create:
- A sense of investment ("I don't want to lose my 7-day streak")
- Visual progress tracking
- Gamification of self-control
- Psychological cost to breaking limits

### How Streaks Work

```
Day 1: User stays within limits → Streak continues
Day 2: User stays within limits → Streak continues
Day 3: User requests more time → Time streak resets to 0
Day 4: User stays within limits → Streak starts building again
```

Streaks are calculated at the end of each day. If you didn't break your streak today, it increments tomorrow.

---

## Commitment Messages

### Purpose
Create a psychological barrier that makes users pause and reflect before exceeding their limits.

### Time Limit Messages (Moderate Tone)
```
"I am choosing distraction over my goals"
"I accept that I am breaking my commitment"
"My focus can wait a little longer"
"I am okay with losing my progress today"
"This video is worth more than my discipline"
```

### Shorts Limit Messages (Harsh Tone)
```
"I am wasting my life on content that does not matter"
"I choose mindless scrolling over meaningful activities"
"Shorts are more important than my goals right now"
"I am feeding my addiction instead of fighting it"
"I accept that I have no self-control today"
```

### Why Different Tones?

- **Videos:** User might have a legitimate reason (important tutorial, etc.)
- **Shorts:** There's almost never a legitimate reason to watch more shorts

---

## User Flows

### Flow 1: Time Limit Exceeded

```
User watching video → Time runs out → Redirect to homepage → Banner appears

Banner options:
├── "Whitelist This Video"
│   └── Closes banner, user can finish THIS video, streak preserved
├── "Request More Time"
│   └── Opens side panel → User types commitment → +5 minutes added, streak broken
└── "Accept & Leave"
    └── Closes banner, user stays on homepage
```

### Flow 2: Shorts Limit Exceeded

```
User watching shorts → Limit reached → Redirect to homepage → Banner appears

Banner options:
├── "Request More Shorts"
│   └── Opens side panel → User types HARSH commitment → +3 shorts added, streak broken
└── "Accept & Leave" (Recommended)
    └── Closes banner, user stays on homepage
```

### Flow 3: Manual Limit Increase (from Side Panel)

```
User opens side panel → Clicks "Add 5 Minutes" or "Add 3 Shorts"
→ View changes to confirmation screen
→ Shows current streak that will be lost
→ Displays commitment message to type
→ User must type message EXACTLY to enable button
→ Confirmation → Limit increased, streak reset to 0
```

---

## Data Model

### Storage Fields

```javascript
{
  // Daily Usage (resets at midnight)
  totalWatchedTime: number,      // milliseconds watched today
  totalWatchedShorts: number,    // shorts count today
  totalVideosWatched: number,    // video count today

  // Current Limits (can be increased during the day)
  timeLimit: number,             // current time limit in ms (default: 180000 = 3 min)
  shortsLimit: number,           // current shorts limit (default: 5)

  // Timing
  lastRestTime: timestamp,       // last shorts period reset
  lastOpenedDate: string,        // for detecting day change

  // Streaks
  timeStreak: number,            // consecutive days
  shortsStreak: number,          // consecutive days
  timeStreakBrokenToday: boolean,
  shortsStreakBrokenToday: boolean,

  // Whitelist
  whitelistedVideoUrl: string|null,  // currently whitelisted video

  // History (last 7 days)
  history: [
    { date: string, time: number, shorts: number, videos: number }
  ],

  // UI State
  showTimeBanner: boolean,
  showShortBanner: boolean
}
```

---

## UI Components

### 1. Side Panel (Dashboard)
- Primary interface for viewing stats
- Shows: time used, shorts watched, videos count
- Shows: both streaks with visual indicators
- Shows: 7-day history
- Manual controls to increase limits (with warning)

### 2. Popup (Quick Stats)
- Accessed from browser toolbar
- Shows at-a-glance stats
- Progress bars with color coding
- Button to open full dashboard

### 3. Banners (Limit Exceeded)
- Injected into YouTube when limits are exceeded
- Modal overlay with blur backdrop
- Clear options for user to choose

### 4. Onboarding Page
- Multi-step welcome flow
- Explains the philosophy
- Shows default limits
- Opens on first install

---

## Design Decisions

### Why 3 Minutes Default?
- Intentionally strict
- Forces users to be selective about what they watch
- Easy to understand
- Can be extended if needed (but costs streak)

### Why 5 Shorts per 2 Hours?
- Shorts are typically 15-60 seconds
- 5 shorts = roughly 2-5 minutes
- 2-hour window prevents binge patterns
- Resets automatically (no user action needed)

### Why No "Decrease Limit" Option?
- Users should start strict and stay strict
- Making it harder encourages discipline
- If they want stricter limits, they can just... stop watching

### Why Whitelist Only for Videos?
- Videos can be legitimately important
- Shorts are never important
- Whitelist is a middle-ground between "give up" and "break streak"

### Why Show History?
- Accountability
- Pattern recognition ("I always watch too much on weekends")
- Progress tracking over time

---

## Color System

```css
Primary:    #6366F1 (Indigo - Focus & Clarity)
Success:    #10B981 (Green - Streaks maintained, safe zone)
Warning:    #F59E0B (Amber - Approaching limit)
Danger:     #EF4444 (Red - Limit exceeded, streak broken)
```

### Progress Bar States
- **0-69%:** Green (safe)
- **70-89%:** Yellow (warning)
- **90-100%:** Red (danger)

---

## Future Considerations

These are ideas that could be implemented later:

1. **Configurable Limits** - Let users set their own time/shorts limits
2. **Weekly Reports** - Summary of YouTube usage patterns
3. **Blocked Hours** - No YouTube during certain times
4. **Category Blocking** - Block shorts entirely, or specific channels
5. **Focus Mode** - Temporary stricter limits for productivity sessions
6. **Export Data** - Download usage history as CSV
7. **Sync Across Devices** - Using Chrome sync storage

---

## Summary

TubeLiberty is built on these principles:

1. **Limits are guardrails, not goals**
2. **Staying within limits is the win**
3. **Shorts are almost never valuable - be harsh**
4. **Videos can be valuable - allow whitelist**
5. **Streaks create psychological investment**
6. **Commitment messages create friction**
7. **Make breaking limits feel costly**

The goal is not to ban YouTube entirely, but to help users consume it mindfully and intentionally.
