# Master Deployment Changelog
**Covers:** All changes across `global-conflicts-website` + `discord-bot` for this release
**Deployment date:** ~March 2026
**Source notes:** `2025-02-18-reforger-mission-plan.md`, `2025-02-20-Mission-stats.md`, `2025-02-23-discord-integration.md`

---

## ⚠️ Pre-Deployment Checklist

### 1. Install new npm packages (website)
```bash
npm install
```
New packages added: `apexcharts ^5.6.0`, `react-apexcharts ^2.0.1`
**The site will fail to build if these are not installed first.**

### 2. Set production environment variables

#### `global-conflicts-website` — production `.env`

| Variable | Value | Notes |
|----------|-------|-------|
| `BOT_URL` | `http://globalconflicts.net:3001` | **Required** — previously hardcoded everywhere, now an env var. Without this, ALL bot calls fail. |
| `WEBSITE_URL` | `https://globalconflicts.net` | For Discord embed links |
| `DISCORD_BOT_AAR_CHANNEL` | `1336073901553483836` | Forum channel ID for AAR session threads |
| `DISCORD_GUILD_ID` | `635885194288562206` | Used to build `discord.com/channels/...` deep-links |

#### `discord-bot` — production `.env`

| Variable | Value | Notes |
|----------|-------|-------|
| `REFORGER_SERVER_CONFIG_PATH` | path to **folder** containing `config.json` | Code appends `/config.json` — must be a folder, not the file |
| `MAIN_REFORGER_SERVER_START_SCRIPT_PATH` | path to **folder** containing `start.ps1` | Code appends `/start.ps1` — must be a folder, not the file |
| `API_SECRET` | shared secret string | Must match `API_SECRET` on the website |
| `WEBSITE_URL` | `https://globalconflicts.net` | For `rate_mission` API calls |
| `DISCORD_SERVER_ID` | `<guild ID>` | Used in user/member fetches |
| `DISCORD_DONATOR_ROLE_ID` | `<role ID>` | Used by `/users/donators` endpoint |

### 3. After deploying — first-run actions
1. **Rebuild & restart the Discord bot** — it now uses the Discord REST API (not the Gateway cache) for user lookups, so it needs to be running the new code before the next step.
2. **Admin Controls → Refresh Discord Users** — re-syncs all guild members with `globalName` (display names like "Blue" instead of usernames like "bluebedouin").
3. **Admin Controls → Terrain Mapper** — after the first full GitHub sync, assign display names and images to all terrain GUIDs detected.
4. **Admin Controls → Author Mapper** — link `missionMaker` string names (from GitHub-synced missions) to Discord accounts so embeds and "My Missions" work correctly.

### 4. MongoDB — new collections to create

| Collection | Purpose |
|------------|---------|
| `reforger_missions` | Mission data synced from GitHub (can be overwritten by sync) |
| `reforger_mission_metadata` | Manual data: status, era, tags, history, ratings — never overwritten by sync |
| `discord_users` | Cache of Discord guild members for leader dropdowns |
| `reforger_logs` | Audit log for system actions and sync results |
| `reforger_migration_mappings` | Temporary table used for the one-time spreadsheet import into `reforger_mission_metadata` |

### 5. MongoDB — new fields on existing collections (no migration needed)

- `configs.reforger_allowed_terrains` — populated via Terrain Mapper
- `configs.author_mappings` — populated via Author Mapper: `{ name: string, discordId: string }[]`
- `configs.activeSession` / `configs.sessionHistory` — written on first mission load
- `discord_users[].globalName` — populated on first user sync after bot deploy
- `reforger_mission_metadata.history[].ratings[]` — populated when players rate sessions
- `users[].lastRoleRefresh` — set on first login after deploy

---

## Feature Summary

---

### Feature 1 — Reforger Mission System: GitHub Sync

The core of the system. A synchronization script (`lib/reforger-github-sync.ts`) mirrors missions from the `gc-reforger-missions` GitHub repository into the database.

**Two sync modes:**
- **Incremental (daily):** Finds PRs merged since last sync, processes only changed `.conf` files
- **Full:** Re-processes every mission file — use for initial setup or to fix inconsistencies

**Per-mission sync process:**
1. Parses name, description, author, min/max player count
2. Extracts mission GUID (e.g. `{42191E5F4AB38496}`) → stored as `missionId`
3. Resolves terrain GUID from the world file
4. Upserts the `reforger_missions` collection

**Sync logging:** Outputs real-time progress logs: PR count, terrain map build, per-file processing.

---

### Feature 2 — Terrain Resolution & Terrain Mapper

Missions store their terrain as a GUID (`B70B908EF90E5F3A`), not a name. The Terrain Mapper in Admin Controls provides a UI to map these GUIDs to human-readable display names and image URLs. Mappings are stored in `configs.reforger_allowed_terrains`.

The mission list falls back to showing the raw GUID if no mapping exists.

---

### Feature 3 — Mission Metadata & History

Two-collection model:
- **`reforger_missions`** — synced from GitHub, can be overwritten
- **`reforger_mission_metadata`** — manual data (status, era, tags, history, ratings), never overwritten by sync

Authorized users (Admin / GM / Mission Reviewer) can edit metadata directly from the mission detail page.

---

### Feature 4 — Automatic Status Management

- New missions from sync start with status **"New"**
- On first gameplay session logged, status auto-upgrades to **"No issues"** (if still "New")
- Manual status set by an admin always takes precedence

---

### Feature 5 — Smart Sort

Ranks missions by a "fairness" score to promote variety. Toggled by users on the mission list page. All factors are configurable.

| Factor | Points |
|--------|--------|
| New mission (never played) | +1000 |
| Rarity boost (1 play) | +33; diminishes with play count |
| Time decay | +1/day since last played, max +100 |
| Rating boost | `avg_rating × 10` (0–50) |
| Variety penalty | −25 per tag matching previous session |
| Player Fit | 0–+5 (only when Players filter is set) |
| Major issues | −2000 (non-configurable) |
| SEED type | −9999 (non-configurable) |

Hovering a Smart Score shows a full breakdown tooltip. Fun/SEED missions are always sorted to the bottom when Smart Sort is active.

---

### Feature 6 — Mission Groups

Missions with multiple map variants (e.g. "Roulette" on 10 maps) can be assigned to a named group. Groups share **Time Decay** and **New Mission Priority** for Smart Sort — if any member has been played, the whole group loses the New Mission bonus.

---

### Feature 7 — Mission List: Filters & Layout

**Client-side filters** (persist via `localStorage`): name/author text search, player count, min/max slot ranges, type multi-select, map multi-select, status, author, tags, era, respawn, show fun missions, dense mode, all-data mode, show unlisted (admin only).

**Layout:** Full-width table, collapsible filter panel at top.

**Three table views:** Normal · Smart Sort · All Data

**SEED type normalisation:** `SD`/`AAS` prefixes normalised to `SEED` both in the dashboard and the type filter dropdown.

---

### Feature 8 — Mission Library Stats Dashboard

A **"Stats"** button on the `/reforger-missions` header toggles a collapsible analytics panel.

**Summary pills:** Total missions, total plays, most played, terrain count, author count. All update when a type filter is active.

**Charts:**
| Chart | Type |
|-------|------|
| Mission Type | Interactive donut — clicking a slice cross-filters all other charts |
| Top Terrains | Horizontal bar |
| Era distribution | Horizontal bar |
| Top 10 Mission Tags | Horizontal bar |
| Missions Supporting Each Player Count | Stacked area |
| Last Played by Max Player Count | Scatter |
| Player Count Ranges | Floating bar |
| Last Played Heatmap by Player Count & Year | Heatmap |
| Missions Added Over Time | Stacked bar (all time) |
| Play Activity by Week | Stacked bar (last 10 weeks, Tue–Mon) |
| Author Contributions | Olympic podium (top 3) + bar+line (all) |

All data computed client-side from the already-loaded `missions` prop — no extra API calls.

---

### Feature 9 — Discord User List Caching & Session Performance

The leader-selection dropdown in gameplay history was previously fetched live from the Discord bot on every page load. It is now cached in MongoDB.

**How it works:**
1. `discord_users` collection stores `userId`, `username`, `globalName`, `nickname`, `displayName`, `displayAvatarURL`
2. **GM Controls → Refresh Discord Users** calls the bot, fetches all members, upserts the cache
3. Leader dropdown reads from `discord_users` — no live bot calls on page load
4. `getServerSideProps` uses `getServerSession` (no internal HTTP call) instead of `getSession`

**Session callback — lazy role refresh:** `[...nextauth].ts` checks `lastRoleRefresh` on each visit. If >24 hours old, makes one `/users/:id` call (3s timeout) to refresh roles and nickname. All other visits read instantly from DB. If the bot is down, cached roles are used silently.

**`globalName` fix:** The Discord bot's `/users` and `/users/:id` endpoints now use the Discord REST API directly (not the Gateway cache), so `global_name` is always populated. Previously, Gateway-cached member objects did not include `global_name`.

---

### Feature 10 — Live Session Discord Integration

GMs (and now Mission Review Team) can load the next mission from the website, which:
1. Restarts the Reforger server
2. Optionally posts a session embed to the `#after-action-reports` Discord forum channel
3. Keeps that embed up to date as the session progresses

#### "Load Mission" Button
- Visible to **GM, Admin, Mission Review Team**
- Double-confirm modal with "Post to Discord" checkbox
- Sets a 2-minute server load lock in `configs.serverLoadLock`
- Calls bot `POST /server/set-scenario` to update `config.json` and restart

**Initial Discord embed:**
```
Loading mission:
**{Type} ({min}-{max}) {Mission Name}** by {Author}
{short description ≤200 chars}
👍 N  🆗 N  👎 N
[View on website](https://globalconflicts.net/reforger-missions/...)
```
Footer: `Loaded by {name}  •  HH:MM`

Author resolved: guild nickname → globalName → username (from `users` collection), then falls back to `author_mappings` lookup.

#### Gameplay History: Session Discord message
The history modal's "Post to Discord" checkbox is replaced with a **session selector dropdown**:
- Auto-selects the current active session for new entries
- Shows all sessions from today (from `configs.sessionHistory`)
- Can link or unlink an entry to a Discord session message

When a session is linked and history is saved, the bot edits the Discord embed with updated mission info, leaders, and outcome.

**Discord session embed (in-progress):**
```
Playing mission:
**{Type} ({min}-{max}) {Mission Name}** by {Author}
{short description}

**{Outcome}**
**{Side}:** @mention, @mention
[View on website](...)
```
Footer: `Session started HH:MM` → `Session duration: Xh Ymin` once outcome is set.
Colour: green (in-progress) → blue/red/green/grey based on outcome.

When outcome is set, the bot adds 👍 🆗 👎 reactions to the message.

#### Leader AAR
- AAR modal: style fix (dark/light theme), structured template, session date display, dual save buttons (save only / save + post to Discord)
- AAR Discord embed posted to the session's thread
- Existing AAR can be updated or deleted from Discord

**AAR Discord embed:**
```
**{Mission Name}**
*Played {weekday, day month year}*

**AAR by {Leader Name}**

{AAR text ≤3700 chars}

[View on website](...)
```

---

### Feature 11 — Session-Level Mission Ratings

Ratings moved from a single mission-level dropdown to **per-session** ratings.

- Ratings stored on `reforger_mission_metadata.history[].ratings[]`
- Only sessions within the last **48 hours** can be rated
- Mission authors cannot rate their own missions
- Discord reactions (👍 🆗 👎) on the session embed trigger ratings via the bot → website API
- Bot enforces: only one vote per user per session, removes previous vote on change, non-rating reactions silently removed, must have `"Member"` role
- Website: per-session rating buttons shown inline in the history list; buttons highlighted for current vote; negative rating toast directs user to `#feedback`

---

### Feature 12 — Author Mapper

Admin Controls → Author Mapper: maps `missionMaker` string names (from GitHub-synced missions) to Discord user accounts.

- Uses the same searchable Discord user dropdown as the leader selector
- Mappings stored in `configs.author_mappings`
- Used by: Load Mission embed, session Discord embed, "My Missions" page

---

### Feature 13 — "My Missions" Page — Reforger section added

`/user/my-missions` now shows both Arma 3 and Arma Reforger missions in separate tables.

Reforger mission lookup uses **both** `authorID` (direct match) and `missionMaker` (via Author Mapper), so GitHub-synced missions appear once the mapping is set up.

Ratings are aggregated from `reforger_mission_metadata.history[].ratings[]` across all sessions.

---

### Feature 14 — Leadership History Page

`/user/leadership-history` replaces the "Under construction" placeholder with a full table of Arma Reforger sessions where the logged-in user led a mission.

- Queries `reforger_mission_metadata.history[].leaders[].discordID`
- Columns: Mission, Date, Type, Side, Outcome, Ratings
- Shows "You have led X sessions since {first tracked month}" with a note that earlier sessions are not recorded
- Sorted most recent first; clicking a row opens the mission page

---

### Feature 16 — "Create Discord message" recovery option

If a GM or Admin starts a mission by other means (in-game menus, RCON, etc.) without going through the website, no Discord session post is created. This option provides a manual recovery path.

**Location:** Gameplay History modal → "Session Discord message" dropdown → **"+ Create Discord message"** is always the first option in the list, with a description line explaining its purpose.

**Behaviour:**
- **If a Discord post already exists** for this mission in today's session (matched by `uniqueName` + today's thread): returns that entry, auto-selects it in the dropdown, and shows an info toast — no duplicate is created.
- **If no post exists:** creates a Discord embed identical to what "Load Mission" would have posted, reusing today's forum thread if one exists or creating a new one if not. The new entry is added to the session dropdown and auto-selected.

The new session entry is also written to `configs.activeSession` and `configs.sessionHistory` so it behaves identically to a Load Mission post for all downstream features (history linking, Discord embed updates, ratings).

**New file:** `pages/api/reforger-missions/[uniqueName]/create-discord-message.ts`
**Requires:** GM / Admin / Mission Reviewer credential

---

### Feature 15 — BOT_URL environment variable

All hardcoded `http://globalconflicts.net:3001` URLs across the website have been replaced with `process.env.BOT_URL ?? "http://globalconflicts.net:3001"`.

This means local development automatically uses `http://localhost:3001` (via `.env.local`) and production uses the value set in the production environment.

**Files affected:** `lib/discordPoster.ts` + 17 files under `pages/api/`

---

## Files Changed

### `global-conflicts-website`

| File | Change |
|------|--------|
| `pages/reforger-missions/index.tsx` | Mission list, Smart Sort, Stats dashboard, Mission Groups, filters, SEED normalisation, Admin/GM Controls buttons |
| `pages/reforger-missions/[uniqueName]/index.tsx` | Mission detail, metadata editing, history display, Load Mission button, session rating buttons, Discord link in history, AAR modal |
| `pages/user/my-missions.tsx` | Added Reforger missions section; Author Mapper lookup |
| `pages/user/leadership-history.tsx` | Replaced "Under Construction" with Reforger leadership history table |
| `components/modals/load_mission_modal.tsx` | **New** — double-confirm load modal; role badge list |
| `components/modals/gameplay_history.tsx` | Session selector, session timestamps, auto-fill end time, "Create Discord message" recovery button |
| `components/modals/submit_aar_modal.tsx` | Style fix, AAR template, session date, dual save/Discord buttons |
| `components/modals/admin_controls_modal.tsx` | Terrain Mapper, Author Mapper; "Mission Reviewer" → "Mission Review Team" label |
| `components/modals/gm_controls_modal.tsx` | Refresh Discord Users button |
| `pages/api/reforger-missions/index.ts` | Mission upload API |
| `pages/api/reforger-missions/list.ts` | Mission list API |
| `pages/api/reforger-missions/sync-from-github.ts` | GitHub sync trigger (full + incremental) |
| `pages/api/reforger-missions/authors.ts` | **New** — GET distinct missionMaker names + mappings; POST saves mapping |
| `pages/api/reforger-missions/[uniqueName]/index.ts` | Mission detail API |
| `pages/api/reforger-missions/[uniqueName]/load-mission.ts` | Server load, Discord embed, session lock; Mission Reviewer access |
| `pages/api/reforger-missions/[uniqueName]/create-discord-message.ts` | **New** — creates a session Discord post without loading the mission; duplicate-safe |
| `pages/api/reforger-missions/[uniqueName]/history/index.ts` | `buildSessionEmbed()`, author/leader resolution, `historyEntryId` to bot, client `_id` preserved |
| `pages/api/reforger-missions/[uniqueName]/history/[historyId]/aar.ts` | **New** — Reforger AAR endpoint with Discord post/update/delete |
| `pages/api/reforger-missions/[uniqueName]/rate_mission.ts` | Full rework: session-scoped, 48h window, arrayFilters, bot auth |
| `pages/api/active-session.ts` | Returns `{ activeSession, sessionHistory }` |
| `pages/api/server-lock.ts` | **New** — GET returns current server lock state |
| `pages/api/discord-users.ts` | Caches guild members; GET extended to Mission Reviewer; POST stores `globalName`; uses `BOT_URL` |
| `pages/api/auth/[...nextauth].ts` | Lazy role refresh (24h); reads from DB only; uses `BOT_URL` |
| `lib/discordPoster.ts` | `BOT_URL` at top; all legacy functions updated; new: `callBotSetScenario()`, `callBotPostMessage()`, `callBotEditMessage()`, `callBotPostToThread()`, `callBotDeleteMessage()` |
| `lib/reforger-github-sync.ts` | GitHub sync engine |
| `lib/sessionThread.ts` | **New** — session date / thread name logic |
| `lib/missionSmartScoring.ts` | Smart Sort scoring engine |
| `pages/api/**/*.ts` (17 files) | Hardcoded bot URL → `BOT_URL` env var |

### `discord-bot`

| File | Change |
|------|--------|
| `src/server/server.controller.ts` | New endpoints: `set-scenario`, `post-discord-message`, `edit-discord-message`, `post-to-thread`, `delete-message`; footer optional |
| `src/bot/events/reaction.handler.ts` | **New** — `messageReactionAdd` listener; enforces Member role, single vote, forwards `historyEntryId` to rate_mission API |
| `src/app.module.ts` | Added `Partials` (Message, Channel, Reaction, User) — required for reaction events in forum threads |
| `src/users/users.controller.ts` | `GET /users`: REST API pagination (includes `global_name`); `GET /users/:id`: REST API force-fetch; `memberAvatarURL()` helper for CDN URLs |
