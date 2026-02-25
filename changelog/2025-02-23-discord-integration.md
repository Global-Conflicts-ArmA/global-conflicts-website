# Live Session Discord Integration — Implementation Notes

**Date:** 2025-02-23
**Last updated:** 2026-02-24 (session 2)
**Scope:** `global-conflicts-website` + `discord-bot`

---

## Overview

GMs and Admins can load the next mission directly from the website, which restarts the Reforger server and optionally posts a live session tracker to the `#after-action-reports` Discord forum channel. That Discord message is kept up to date as the session progresses (mission in progress, leaders added, outcome recorded). Players can rate the session by reacting with 👍 🆗 👎 on the Discord message once an outcome is set. Leaders can submit a post-session AAR from the website and optionally post it to the session thread.

---

## What Was Built

### Feature 1 — "Load Mission" Button

- **File:** `pages/reforger-missions/[uniqueName]/index.tsx`
- Visible to `ADMIN` and `GM` only
- Double-confirm modal (`components/modals/load_mission_modal.tsx`) with "Post to Discord" checkbox
- On confirm, calls `POST /api/reforger-missions/[uniqueName]/load-mission`

**API: `POST /api/reforger-missions/[uniqueName]/load-mission`**

- Requires `scenarioGuid` on the mission — blocked with an error toast if missing ("run a full sync first")
- Sets a **2-minute server load lock** in `configs.serverLoadLock` (prevents double-loads)
- Calls bot `POST /server/set-scenario` to update `config.json` and restart the server
- If "Post to Discord" is checked:
  - Resolves or creates a forum thread for today's session (`lib/sessionThread.ts`)
  - Constructs a rich embed: mission name/type/size, author ("mission by X"), short description, ratings summary (👍🆗👎), website link
  - Calls bot `POST /server/post-discord-message` → returns `{ messageId, threadId }`
  - Stores `activeSession` in `configs` (threadId, messageId, loadedBy, startedAt, etc.)
  - Appends to `configs.sessionHistory` (capped at 20 entries) with `{ uniqueName, missionName, messageId, threadId, discordMessageUrl, loadedAt }`
- Audit-logged via `lib/logging.ts` as `"load_mission"`

**Initial Discord embed format:**
```
Loading mission:
**{Type} ({min}-{max}) {Mission Name}** by {Author}
{short description (≤200 chars)}
👍 N  🆗 N  👎 N
[View on website](https://globalconflicts.net/reforger-missions/...)
```
Footer: `Loaded by {name}  •  HH:MM`

Author is resolved in order: guild nickname → globalName → username from the `users` collection, then falls back to `author_mappings` in `configs` (mapped Discord mention or plain missionMaker string).

---

### Feature 2 — Discord Bot: Endpoints

**File:** `discord-bot/src/server/server.controller.ts`

#### `POST /server/set-scenario`
Updates `config.json` (`game.scenarioId`) and restarts the server via `start.ps1`. The config path and script path are taken from env vars pointing to **folders** (filenames are appended in code).

#### `POST /server/post-discord-message`
Generic Discord relay. Detects whether the target channel is a **Forum channel** (`ChannelType.GuildForum`) or a standard text channel:
- **Forum (new):** Creates a forum post with `"AAR Thread"` as the plain-text starter message, then sends the actual session embed as the first reply. Returns the reply's `messageId` (not the thread ID).
- **Forum, existing threadId:** Appends a new message to the existing thread.
- **Text channel:** Creates or reuses a thread by name.

Returns `{ messageId, threadId }`.

> **Note:** The starter message is intentionally generic — Discord forum posts treat the first message differently (pinned/displayed prominently), so keeping it as a label prevents session embeds from being awkwardly pinned.

#### `POST /server/edit-discord-message`
Edits an existing message in a thread by `messageId`/`threadId`. Optionally adds 👍 🆗 👎 reactions and registers the message in the in-memory `ratableMessages` map when `addReactions: true` is passed.

#### `POST /server/post-to-thread`
Posts an embed directly into an existing thread by `threadId`. Used for AAR posts.

#### `POST /server/delete-message`
Deletes a specific message from a thread by `{ threadId, messageId }`. Used when a leader removes their AAR Discord post.

**Fix: Discord.js Partials**

`app.module.ts` — added `Partials.Message`, `Partials.Channel`, `Partials.Reaction`, `Partials.User` to the Discord client. Without these, `messageReactionAdd` events were silently dropped for messages not in the bot's cache (which is always the case for forum thread messages).

---

### Feature 3 — Session-Level Mission Ratings

Ratings were moved from a single mission-level dropdown to per-session ratings attached to individual gameplay history entries.

**`pages/api/reforger-missions/[uniqueName]/rate_mission.ts`** — Complete rework:
- Requires `historyEntryId` in request body
- Looks up the specific history entry in `reforger_mission_metadata`
- Rejects with 403 if the session is older than 48 hours
- Upserts the rating into `history.$[entry].ratings` using MongoDB `arrayFilters`
- Accepts `x-api-secret` header for bot calls (Discord reactions)
- Prevents the mission author from rating their own mission

**`discord-bot/src/bot/events/reaction.handler.ts`** — `messageReactionAdd` listener:
1. Resolves partials (message, user)
2. Ignores bot reactions
3. Checks if `messageId` is in `ratableMessages`
4. Checks emoji is 👍, 🆗, or 👎 — removes non-rating reactions silently
5. Fetches GuildMember and checks for `"Member"` role (string match, case-sensitive)
6. Removes the user's previous rating reaction (so only one vote per user)
7. POSTs to `rate_mission` with `{ discordUserId, value, historyEntryId }`

**`pages/reforger-missions/[uniqueName]/index.tsx`** — UI changes:
- Removed the mission-level rating dropdown entirely
- Mission aggregate (👍🆗👎 in the header) is now computed from all history entries' `ratings` arrays
- Each history entry shows rating counts inline: 👍N 🆗N 👎N
- Members within the 48-hour window see clickable rating buttons with counts embedded
- Buttons are highlighted to show the user's current vote
- Toast messages on rating: positive/neutral give brief confirmation; negative directs to `#feedback` on Discord (shown for 6 seconds)

**`discord-bot/src/server/server.controller.ts`** — `ratableMessages` map updated:
- Value type extended to `{ uniqueName: string; historyEntryId: string }`
- `historyEntryId` stored and forwarded so the bot can send it to `rate_mission`

---

### Feature 4 — Gameplay History: Session Discord Message

**File:** `components/modals/gameplay_history.tsx`

Replaced the "Post to Discord" checkbox with a **"Session Discord message" dropdown**:

- On modal open, fetches `GET /api/active-session` which returns `{ activeSession, sessionHistory }`
- Dropdown shows all missions loaded during the current session (from `sessionHistory`), most recent first
- The session matching `activeSession.messageId` is **auto-selected** for new entries
- When **editing** an existing entry, the dropdown auto-selects the matching session by `discordMessageId`; if not found in session history (old entry), a synthetic "(linked)" option is shown
- Clearing the dropdown to "None" means no Discord update on save
- Labels renamed: "Session started" → "Mission started", "Session ended" → "Mission ended"

When a session is selected, `discordMessageId`, `discordThreadId`, and `discordMessageUrl` are included in the POST/PUT body.

**Other additions to the modal (Reforger only):**
- **Mission started / Mission ended** datetime inputs — auto-filled from `activeSession.startedAt` on open; "Mission ended" auto-fills with current time when an outcome is first selected (works for both new and existing entries)
- **"View in Discord" link** — shown inline next to the dropdown label when a session with a `discordMessageUrl` is selected

**File:** `pages/api/reforger-missions/[uniqueName]/history/index.ts`

Both POST and PUT handlers:
- Use `discordMessageId`/`discordThreadId` directly from the request body — no `activeSession` lookup
- Build and send the embed via `callBotEditMessage` if IDs are present
- Pass `historyEntryId: history._id.toString()` to `callBotEditMessage` when setting outcome (so the bot can register the message as ratable)
- `buildSessionEmbed()` function constructs the embed:

```
Playing mission:   ← "Played mission:" once outcome is set
**{Type} ({min}-{max}) {Mission Name}** by {Author}
{short description}

**{Outcome}**
**{Side}:** @mention, @mention   ← "Leader" if no side selected
[View on website](...)
```
Footer (no outcome): `Session started  HH:MM`
Footer (with outcome + timestamps): `Session duration: Xh Ymin`

Embed colour: green (in-progress) → blue/red/green/grey based on outcome keyword.

When outcome is set, `addReactions: true` + `historyEntryId` are passed to `callBotEditMessage` so the bot adds 👍 🆗 👎 and registers the message as ratable for that specific session.

**Bug fix — ObjectId mismatch:**
The gameplay history modal generated `new ObjectID()` client-side for new entries. The POST handler previously overwrote this with a fresh server-side `new ObjectId()`, meaning the client never knew the server-assigned ID. Fixed by changing the POST handler to use the client-provided `_id` (converted to ObjectId) rather than generating a new one.

---

### Feature 5 — Discord Link on Website History

**File:** `pages/reforger-missions/[uniqueName]/index.tsx`

Added a **"Discord"** button in the gameplay history list for any entry that has a `discordMessageUrl` stored. Links directly to the Discord message.

---

### Feature 6 — Session History API

**File:** `pages/api/active-session.ts`

Extended to return both `activeSession` and `sessionHistory` from `configs`:

```json
{
  "activeSession": { "messageId": "...", "threadId": "...", "startedAt": "...", ... },
  "sessionHistory": [
    { "uniqueName": "...", "missionName": "...", "messageId": "...", "threadId": "...", "discordMessageUrl": "...", "loadedAt": "..." }
  ]
}
```

---

### Feature 7 — Leader AAR Improvements

**File:** `components/modals/submit_aar_modal.tsx`

- **Style fix:** Replaced hardcoded `bg-white` container with `modal-standard` class (dark/light theme aware, matches other modals)
- **AAR template:** Pre-fills the editor for new submissions with a structured template:
  - Plan vs Reality
  - What Went Well *(with hint to be specific)*
  - What Went Poorly *(framed around plan/coordination, not individuals)*
  - Key Decisions
  - For Next Time
- **Session date display:** Shows "Session played: Monday, 24 February 2026" under the title so leaders know which session they are filling out when returning later in the week
- **Dual save buttons:**
  - **Save** — saves AAR text to DB only
  - **Save and post to Discord AAR thread** — saves and posts to the session's Discord thread
  - When a Discord post already exists: replaces with **Save & update Discord message** + **Delete Discord post** (danger/outline)
- `apiBase` prop (defaults to `"missions"`) allows the same modal to serve both old Arma 3 missions and new Reforger missions

**File:** `pages/api/reforger-missions/[uniqueName]/history/[historyId]/aar.ts` — **New**

Reforger-specific AAR endpoint (the old `api/missions/` endpoint only updated the `missions` collection):
- Updates `reforger_mission_metadata.history.$[].leaders.$[].aar` via `arrayFilters`
- Stores `aarDiscordMessageId` on the leader entry when posted to Discord
- Supports three Discord actions via request body flags:
  - `postToDiscord: true` — posts new embed to session thread, stores `messageId`
  - `updateDiscordMessage: true` — edits existing Discord embed
  - `deleteDiscordMessage: true` — deletes Discord message and clears stored `aarDiscordMessageId`
- Returns `{ ok, discordMessageId?, discordMessageDeleted? }`

**AAR Discord embed format:**
```
**{Mission Name}**
*Played {weekday, day month year}*

**AAR by {Leader Name}**

{AAR text (truncated to 3700 chars)}

[View on website](https://globalconflicts.net/reforger-missions/...)
```
No footer.

---

## Data Schema

### `configs` collection (new/changed fields)

```json
{
  "activeSession": {
    "threadId": "...",
    "threadName": "Sunday, 23/02/2025",
    "messageId": "...",
    "uniqueName": "dusty-drive",
    "missionName": "Dusty Drive",
    "loadedBy": "Peregrine",
    "loadedByDiscordId": "...",
    "startedAt": "2025-02-23T20:00:00Z"
  },
  "sessionHistory": [
    {
      "uniqueName": "dusty-drive",
      "missionName": "Dusty Drive",
      "messageId": "...",
      "threadId": "...",
      "discordMessageUrl": "https://discord.com/channels/1422521850055098470/.../...",
      "loadedAt": "2025-02-23T20:00:00Z"
    }
  ],
  "serverLoadLock": {
    "lockedBy": "Peregrine",
    "lockedByDiscordId": "...",
    "missionName": "Dusty Drive",
    "lockedAt": "2025-02-23T20:00:00Z",
    "expiresAt": "2025-02-23T20:02:00Z"
  }
}
```

### `reforger_mission_metadata` — history entries (new fields)

```json
{
  "history": [
    {
      "_id": "...",
      "date": "...",
      "outcome": "BLUFOR Victory",
      "leaders": [
        {
          "discordID": "...",
          "name": "...",
          "side": "BLUFOR",
          "aar": "## Plan vs Reality\n...",
          "aarDiscordMessageId": "..."
        }
      ],
      "ratings": [
        { "ratingAuthorId": "discord_id", "value": "positive|neutral|negative", "date": "ISO" }
      ],
      "sessionStartedAt": "2025-02-23T20:00:00Z",
      "sessionEndedAt": "2025-02-23T21:45:00Z",
      "discordMessageId": "...",
      "discordThreadId": "...",
      "discordMessageUrl": "https://discord.com/channels/1422521850055098470/.../..."
    }
  ]
}
```

---

## Environment Variables Added

### `global-conflicts-website/.env.local`
| Variable | Purpose |
|----------|---------|
| `BOT_URL` | Base URL for the Discord bot REST API |
| `WEBSITE_URL` | Website base URL for Discord embed links |
| `DISCORD_BOT_AAR_CHANNEL` | Channel ID where AAR session messages are posted |
| `DISCORD_GUILD_ID` | Guild ID used to construct Discord message deep-links |

### `discord-bot/.env`
| Variable | Purpose |
|----------|---------|
| `REFORGER_SERVER_CONFIG_PATH` | **Folder** containing `config.json` |
| `MAIN_REFORGER_SERVER_START_SCRIPT_PATH` | **Folder** containing `start.ps1` |
| `API_SECRET` | Shared secret for bot → website API calls |
| `WEBSITE_URL` | Website URL for `rate_mission` API calls (use `https://` in production) |

Note: both server path vars point to **folders**, not files. The code appends the filename.

---

## Files Changed

### `global-conflicts-website`
| File | Change |
|------|--------|
| `pages/reforger-missions/[uniqueName]/index.tsx` | Load Mission button (now also visible to Mission Review Team), server lock UI, Discord link in history, session-level rating buttons, AAR modal state |
| `components/modals/load_mission_modal.tsx` | **New** — double-confirm load modal; role badge list (GM / Admin / Mission Review Team) |
| `components/modals/gameplay_history.tsx` | Session selector dropdown, session timestamps, auto-fill end time, label rename |
| `components/modals/submit_aar_modal.tsx` | Style fix, AAR template, session date display, dual save/Discord buttons, `apiBase` prop |
| `components/modals/admin_controls_modal.tsx` | Author Mapper (map missionMaker strings → Discord users); badge label "Mission Reviewer" → "Mission Review Team" |
| `pages/api/reforger-missions/[uniqueName]/load-mission.ts` | Rich initial embed; author resolved via `users` collection + `author_mappings` fallback; access extended to `MISSION_REVIEWER` |
| `pages/api/reforger-missions/[uniqueName]/history/index.ts` | `buildSessionEmbed()` format polish; author + leader resolution via `author_mappings`; leader side fallback "Leader" (was "Unknown") |
| `pages/api/reforger-missions/[uniqueName]/history/[historyId]/aar.ts` | `[View mission]` → `[View on website]`; empty footer suppressed |
| `pages/api/reforger-missions/[uniqueName]/rate_mission.ts` | Full rework: session-scoped, 48h window, `arrayFilters`, bot auth |
| `pages/api/reforger-missions/authors.ts` | **New** — GET returns distinct missionMaker names + `author_mappings`; POST upserts a name→discordId mapping |
| `pages/api/active-session.ts` | Returns `{ activeSession, sessionHistory }` |
| `pages/api/server-lock.ts` | **New** — GET returns current server lock state |
| `pages/api/discord-users.ts` | GET access extended to `MISSION_REVIEWER`; POST sync stores `globalName`; bot URL now reads from `BOT_URL` env var |
| `lib/discordPoster.ts` | All functions now use `BOT_URL` env var (was hardcoded); added `callBotSetScenario()`, `callBotPostMessage()`, `callBotEditMessage()`, `callBotPostToThread()`, `callBotDeleteMessage()` |
| `lib/sessionThread.ts` | **New** — session date / thread name logic |
| `pages/api/**/*.ts` (17 files) | All hardcoded `http://globalconflicts.net:3001` URLs replaced with `${process.env.BOT_URL ?? "http://globalconflicts.net:3001"}` |

### `discord-bot`
| File | Change |
|------|--------|
| `src/server/server.controller.ts` | `set-scenario`, `post-discord-message`, `edit-discord-message`, `post-to-thread`, `delete-message` endpoints; footer now optional (skipped if empty/null) |
| `src/bot/events/reaction.handler.ts` | **New** — `messageReactionAdd` listener; forwards `historyEntryId` |
| `src/app.module.ts` | Added `Partials` config (fixes reaction events in forum threads) |
| `src/users/users.controller.ts` | `GET /users` and `GET /users/:id` now use Discord REST API directly (not Gateway cache) so `global_name` is always populated |

---

## Production Deployment Checklist

### `global-conflicts-website` — production `.env` must have:

| Variable | Value | Notes |
|----------|-------|-------|
| `BOT_URL` | `http://globalconflicts.net:3001` | **Required** — previously hardcoded, now an env var. Without this all bot calls will fail in any environment where the hardcoded URL is wrong. |
| `WEBSITE_URL` | `https://globalconflicts.net` | For Discord embed links |
| `DISCORD_BOT_AAR_CHANNEL` | `<channel ID>` | Forum channel ID for AAR session threads |
| `DISCORD_GUILD_ID` | `<guild ID>` | Used to build `discord.com/channels/...` deep-links |

### `discord-bot` — production `.env` must have:

| Variable | Value | Notes |
|----------|-------|-------|
| `REFORGER_SERVER_CONFIG_PATH` | path to **folder** containing `config.json` | Code appends `/config.json` |
| `MAIN_REFORGER_SERVER_START_SCRIPT_PATH` | path to **folder** containing `start.ps1` | Code appends `/start.ps1` |
| `API_SECRET` | shared secret string | Must match `API_SECRET` on the website |
| `WEBSITE_URL` | `https://globalconflicts.net` | For `rate_mission` API calls |
| `DISCORD_SERVER_ID` | `<guild ID>` | Used in user/member fetches |
| `DISCORD_DONATOR_ROLE_ID` | `<role ID>` | Used by `/users/donators` endpoint |

### After deploying the bot:
1. Go to **Admin Controls → Refresh Discord Users** — this re-syncs all guild members including `globalName` (display names like "Blue" instead of usernames like "bluebedouin")
2. The Author Mapper in Admin Controls can now be used to link `missionMaker` strings to Discord user accounts

### MongoDB — new fields (no migration needed, added on first use):
- `configs.author_mappings` — array of `{ name: string, discordId: string }`
- `discord_users[].globalName` — populated on next user sync
- `reforger_mission_metadata.history[].ratings[]` — populated when players rate sessions
