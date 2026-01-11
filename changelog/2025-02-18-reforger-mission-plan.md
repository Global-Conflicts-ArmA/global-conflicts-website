# Reforger Mission System Plan
2026-02-18

This document outlines the architecture and key features of the Reforger Mission System, which automatically syncs missions from a GitHub repository to the Global Conflicts website and provides tools for management and display.

---

## 1. Core Component: GitHub Sync

The heart of the system is a synchronization script (`lib/reforger-github-sync.ts`) that mirrors missions from the [gc-reforger-missions](https://github.com/Global-Conflicts-ArmA/gc-reforger-missions) repository into the website's database.

### Sync Modes
The system operates in two modes, which can be triggered manually by administrators or via an API endpoint (`/api/reforger-missions/sync-from-github`) for scheduled execution.

*   **Incremental Sync:** This is the standard, daily operation. It searches for Pull Requests merged since the last sync and processes only the mission files (`.conf`) that were changed in those PRs. This is efficient and keeps the database up-to-date with the latest changes.
*   **Full Sync:** This is a comprehensive crawl of the entire GitHub repository. It re-processes every single mission file. This is used for initial setup or to recover from data inconsistencies.

### Core Sync Process
For each mission `.conf` file it processes, the sync script performs the following actions:
1.  **Parses Mission Data:** Extracts the mission name, description, author and the min and max player count.
2.  **Extracts Identifiers:** The mission's unique GUID (e.g., `{42191E5F4AB38496}`) is extracted from its `.conf` file and stored as the primary `missionId`.
3.  **Resolves Terrain GUID:** The script resolves and stores the GUID of the mission's terrain (map). See the "Terrain Resolution" section below for details.
4.  **Updates Database:** It intelligently updates the `reforger_missions` collection. If a mission with the same `missionId` exists, it is updated; otherwise, a new mission document is created.

### Sync Logging & Debugging
To provide visibility into long-running operations, the sync process now outputs detailed, real-time logs to the server console. This allows administrators to monitor the progress and identify where time is being spent. Key logged stages include:
*   The start of a sync process (Full or Incremental).
*   The number of Pull Requests found for a Daily Sync.
*   The start and completion of the terrain map building process.
*   The processing of each individual Pull Request by its title and number.
*   The processing of each specific mission file.

---

## 2. Key Feature: Terrain Resolution & Management

To provide accurate and manageable terrain information, the system uses a multi-stage, GUID-based approach.

1.  **Sync-Time Resolution:** During a GitHub sync, the script does **not** resolve the terrain's name. Instead, it parses the mission's world file (`.ent`) to find the parent world's unique identifier (e.g., `B70B908EF90E5F3A`). This **Terrain GUID** is what gets stored in the mission's `terrain` field in the database.

2.  **Administrative Mapping:** Because a GUID is not user-friendly, a tool is provided for site administrators and the Mission Review Team.
    *   **UI:** An expandable "Terrain Mapper" section is available in the "Admin Controls" modal on the Reforger missions page.
    *   **Functionality:** This interface lists all Terrain GUIDs detected in the missions database. For each GUID, an admin can input a human-readable **Display Name** (e.g., "Everon") and an **Image URL**.

3.  **Data Storage:** These mappings are saved to the main site configuration document in the `configs` collection, inside the `reforger_allowed_terrains` array. Each object in the array contains the `id` (the Terrain GUID), `display_name`, and `image_url`.

4.  **Frontend Display:** When a user visits the Reforger missions list, the server fetches these mappings. It then populates the "Map" column for each mission by matching the mission's stored `terrain` GUID to the mapped display name. If a mapping does not yet exist for a given GUID, the GUID itself is displayed as a fallback.

---

## 3. Key Feature: Mission Metadata & History Management

Data that does not exist in the GitHub repository (such as quality status, historical era, or legacy play counts) is handled by a separate management system that uses two distinct collections. The website reads from both collections and combines the data at runtime to present a complete view of each mission.

*   **`reforger_missions`**: Contains all mission data that is synchronized directly from the GitHub repository. This collection can be partially or fully overwritten during a sync.
*   **`reforger_mission_metadata`**: Contains all manually entered data, such as mission status, era, tags, play history, and ratings. This collection is the permanent record for user-provided information.

### Manual Metadata Editing
Authorized users (Admins, GMs and Mission Reviewers) can edit metadata directly on a mission's detail page. When a change is saved, the data is written **only** to the corresponding mission document in the **`reforger_mission_metadata`** collection.

Because the website reads from this collection on every page load, the change is visible immediately upon refreshing. This approach ensures that manual data is never lost during a GitHub sync, as the `reforger_mission_metadata` collection is not affected by the sync process.


---

## 4. Automatic Status Management

To streamline the mission lifecycle, the system automatically manages the `status` of missions in two scenarios:

1.  **On Creation:** When the GitHub sync discovers a brand new mission, it automatically assigns it a default status of **"New"**. This does not happen for existing missions that are just being updated. This behavior is overridden if manual metadata with a specific status already exists for that mission's `missionId`.

2.  **On First Play:** When the first gameplay session is logged for a mission (making its play count change from 0 to 1), the system checks if its status is still "New". If it is, it automatically updates the status to **"No issues"**. This change is saved to both the live (`reforger_missions`) and persistent (`reforger_mission_metadata`) collections.

This automation ensures that new missions are clearly marked, and that missions which have been successfully played are assumed to have no issues, while always respecting a manual status set by an admin or reviewer.

---

## 5. Key Feature: Smart Sort

To help surface missions that are most suitable for upcoming sessions, the Reforger mission list includes a "Smart Sort" feature. All factors can be toggled on or off by the user via the configuration panel on the mission list page.

*   **Purpose:** When enabled, this overrides the default sort order and ranks missions based on a "fairness" score designed to promote variety and give all missions a chance to be played.
*   **Final Score:** The final score is the sum of all calculations, with a minimum value of **0**. A mission's score cannot be negative.

### Scoring Calculation Details

The total score for a mission is the sum of the following configurable calculations:

1.  **New Mission Priority**
    *   **Description:** Gives a massive advantage to missions that have never been played. If the mission belongs to a Mission Group and any mission in that group has been played, this bonus is suppressed.
    *   **Calculation:** If `Play Count` is 0 (and no group member has been played), the mission receives a flat **+1000** point bonus.

2.  **Rarity Boost**
    *   **Description:** Gives a boost to missions that have been played less often, encouraging them to be selected again. The bonus is highest for missions with only 1 play and diminishes as the play count increases. This factor does not apply to brand-new missions (which get the larger New Mission Priority bonus instead).
    *   **Calculation:** For missions with `Play Count > 0`, the score is `round(50 / (Play Count * 0.5 + 1))`. The denominator grows slowly, ensuring the score drops off smoothly.
    *   **Examples:**
        *   **Played 1 time:** `50 / (1 * 0.5 + 1)` = **+33 points**
        *   **Played 3 times:** `50 / (3 * 0.5 + 1)` = **+20 points**
        *   **Played 5 times:** `50 / (5 * 0.5 + 1)` = **+14 points**
        *   **Played 10 times:** `50 / (10 * 0.5 + 1)` = **+8 points**
        *   **Played 20 times:** `50 / (20 * 0.5 + 1)` = **+5 points**

3.  **Time Decay Boost**
    *   **Description:** Rewards missions that have not been played recently. The score increases for every day that has passed since the mission was last played. For grouped missions, the most recent `Last Played` date across the entire group is used instead of the individual mission's date.
    *   **Calculation:** The score is **+1 point per day** since the `Last Played` date (or group's most recent date), capped at a maximum of **100 points** (approx. 3 months). If a mission has been played but is missing a date, it receives a flat **+50** points.

4.  **Rating Boost**
    *   **Description:** Optionally adds a bonus based on the mission's average community rating (out of 5 stars).
    *   **Calculation:** `round(Average Rating * 10)`. This results in a score from 0-50.

5.  **Variety Penalty**
    *   **Description:** Optionally discourages playing missions that are too similar to the last one. The system automatically detects the tags of the most recently played mission. The tags "Event" and "Event-Custom-Modpack" are excluded from this comparison so that event missions are not penalized for sharing those common tags.
    *   **Calculation:** The mission receives a **-25 point penalty** for each of its non-excluded tags that matches a tag from the previously played mission. The tooltip lists the specific tags that caused the penalty.

6.  **Player Fit**
    *   **Description:** Optionally gives a small bonus to missions whose player slot range best fits the current number of players. This encourages picking missions designed for the current group size. Only activates when the user has entered a value in the "Players" filter.
    *   **Calculation:** `ratio = (currentPlayers - min) / (max - min)`, `fitScore = round(ratio * 5)`. Results in a score from **0 to +5 points**. Only applies when `currentPlayers` falls within the mission's min–max range.

7.  **Major Issues Penalty**
    *   **Description:** A large, non-configurable penalty applied to any mission marked as having "Major issues". This is designed to effectively remove broken missions from consideration.
    *   **Calculation:** The mission receives a **-2000 point penalty**.

8.  **Seeder Penalty**
    *   **Description:** A large, non-configurable penalty applied to missions with type "SEED". Seeder missions are used outside normal playtime and should not appear in session recommendations.
    *   **Calculation:** The mission receives a **-9999 point penalty**.

### Smart Score Tooltip
When hovering over a mission's Smart Score, a tooltip displays:
*   The mission's **tags**.
*   If the mission belongs to a **Mission Group**, the group name and a note that Time Decay is shared across the group.
*   A full **breakdown** of each scoring factor, its point value, and a description of how it was calculated.

### Table Sort Behavior
When Smart Sort is enabled, "fun" mission types (OTHER, LOL) and SEED missions are always pushed to the **bottom** of the table regardless of the current column sort. This is achieved via a custom sort function passed to the DataTable component.

---

## 6. Key Feature: Mission Groups

Some missions exist as multiple variants on different maps (e.g., the "Roulette" series with 10 map versions). The Mission Group feature allows these to be treated as a single entity for fairness-related scoring, while keeping their individual identity and play counts separate.

### How It Works
*   **Assignment:** A GM or Admin assigns a group name (e.g., "Roulette") to missions via the **Edit Metadata** modal on each mission's detail page. The `missionGroup` field is stored in the `reforger_mission_metadata` collection.
*   **Shared Scoring:** When computing Smart Scores, the server finds the most recent `lastPlayed` date across all missions in the same group. This shared date is used for **Time Decay** and **New Mission Priority** calculations. If any mission in the group has been played, the "New Mission" bonus is suppressed for all group members.
*   **Individual Scoring:** Play count, Rarity Boost, Rating Boost, Variety Penalty, and Player Fit are all computed per-mission, not per-group.
*   **Tooltip:** The Smart Score tooltip displays the group name when a mission belongs to a group.
*   **Removal:** Setting the group field to empty removes the mission from its group. The field is cleared from the database using MongoDB's `$unset` operator.

---

## 7. Frontend Mission Filtering

The mission list page provides various client-side filters to help users quickly find missions of interest. These filters persist across sessions via `localStorage`.

*   **"Filter by Anything" Input:** A general search input that filters missions across multiple text-based fields including name, mission maker, era, time of day, type, and terrain names.
*   **"Players" Input:** Allows users to input the number of players currently on a server, filtering missions where this number falls within the mission's `Min` and `Max` player slots. This value is also passed to the Smart Score system for Player Fit calculations.
*   **"Min Slots Range" Inputs:** Filters missions by their minimum player slot count within a specified range.
*   **"Max Slots Range" Inputs:** Filters missions by their maximum player slot count within a specified range.
*   **"Type" Multi-Select:** Filters missions by their operational type (e.g., COOP, TVT, OTHER, LOL).
*   **"Map" Multi-Select:** Filters missions by their terrain/map, using human-readable names mapped from GUIDs.
*   **"Status" Single-Select:** Allows filtering missions by their current status ("No issues", "New", "Minor issues", "Major issues", "Unavailable").
*   **"Author" Input:** Filters missions by the mission maker's name.
*   **"Tags" Multi-Select:** Filters missions by associated tags (e.g., specific scenarios, gameplay styles).
*   **"Era" Multi-Select:** Filters missions by their historical era (e.g., Cold War, Modern).
*   **"Respawn" Single-Select:** Filters missions based on their respawn type (e.g., true, false, "Objective/gameplay based").
*   **"Show Fun Missions" Toggle:** Toggles the visibility of "OTHER" or "LOL" mission types.
*   **"Dense Mode" Toggle:** Toggles the density of table rows.
*   **"Show All Data" Toggle:** Switches between a simplified "Normal" view and a more detailed "All Data" view for the mission table.
*   **"Show Unlisted Missions" Toggle:** (Admin/Reviewer only) Shows missions that are marked as unlisted.

*   **Removed Filters:** The "Show only approved missions" and "Only missions pending audit" filters have been removed. This decision was made because all Reforger missions displayed on this list are now considered approved by default, making these specific filters redundant.

---

## 8. Mission List Page Layout

The Reforger Mission List page (`pages/reforger-missions/index.tsx`) uses a full-width layout, with column content centered, to maximize the display of mission information.

### Top-Aligned Collapsible Filters
All filtering controls are located in a collapsible "Filters" section at the top of the page. This design provides a consistent user experience across all screen sizes, from mobile to desktop. Users can expand the panel to access a rich set of filters and collapse it to focus on the mission data.

### Full-Width Data Table
The mission data table spans the entire width of the container. Column content within the table is centered for better readability. This layout has several advantages:
- **Maximized Data Visibility**: The wider table allows for more columns to be displayed by default, giving users a comprehensive overview without needing to toggle additional data views.
- **Improved Readability**: Truncation with tooltips for "Name", "Terrain", "Summary", and "Author" columns helps prevent excessive text length while still providing full details on hover. Individual column widths are carefully managed for optimal display.
- **Modern Look and Feel**: This layout is in line with modern, data-rich web applications.

### Table Views
There are 3 column views:
1.  **Normal:** Type, Min, Max, Name, Terrain, Summary, Author, Plays, Status, Last Played.
2.  **Smart Sort:** Same as Normal, but with the Smart Score column added as the first column.
3.  **All Data:** Type, Min, Max, Name, Terrain, Summary, Era, Tags, Author, Plays, Status, Last Played, Date Added, Mission ID.

---

## 9. Database Schema Overview

The system introduces several new MongoDB collections and utilizes existing ones.

### New Collections to Create
The following collections must be created in the database for the Reforger Mission System to function correctly.

*   **`reforger_missions`**: Contains mission data synchronized directly from the GitHub repository. This collection can be overwritten during syncs.
*   **`reforger_mission_metadata`**: Contains all manually entered data (e.g., status, era, tags, notes). The website reads from this collection and combines it with data from `reforger_missions` at runtime.
*   **`discord_users`**: A cache of Discord server members used to populate leader selection dropdowns and resolve user details without making slow, repeated calls to the live Discord API.
*   **`reforger_logs`**: A unified collection for auditing all system actions, including the results and progress of the GitHub sync process.
*   **`reforger_migration_mappings` (Temporary)**: Used only for the one-time spreadsheet-to-database migration. It stores the links between a mission's spreadsheet name and its database `missionId`. This collection can be dropped after the migration is complete.

### Existing Collections Modified
*   **`configs`**: This existing single-document collection is modified to hold the `reforger_allowed_terrains` array, which maps terrain GUIDs to human-readable names and images.
*   **`users`**: This existing collection is modified to include a `lastRoleRefresh` timestamp to support the lazy role refresh mechanism for user sessions.

---

## 10. Live Server Deployment

This section outlines considerations for deploying these system changes to a live environment.

### Configuration Update
In addition to the new collections, a manual data update is required for the main `configs` collection to enable the new terrain mapping feature. The `reforger_allowed_terrains` array within the single configuration document needs to be updated.

Each object in this array must conform to the new `MapItem` interface, which includes the `id` (the terrain's unique GUID) and an optional `image_url`.

**Action Required:** After deployment and the first sync has been performed, an administrator must use the **Terrain Mapper** tool in the Admin Controls modal. This tool will automatically detect all terrain GUIDs used by missions and provide an interface to add the correct `display_name` and `image_url` for each. This action will populate the `reforger_allowed_terrains` array with the necessary `id` fields, ensuring the system functions correctly.

---

## 11. Authentication and Authorization

The Reforger Mission System has different levels of access for various features, controlled by user roles.

### Publicly Accessible (No Login Required)
- **View Mission List**: All users can view the list of Reforger missions.
- **View Mission Details**: All users can view the detailed information for any mission.

### Members (`Member` role or higher) (Note they would need to be logged in)
- **Rate a Mission**: Users with the `Member` role (or any higher role) can submit a rating for any mission that has been played at least once.
- **Upload Media to Gallery**: Users with the `Member` role or higher can upload images and videos to a mission's media gallery.

### Deprecated Features
- **Manual Mission Upload**: The `Mission Maker` role is no longer used for uploading missions. The manual upload form has been disabled, as all missions are now synced directly from the official GitHub repository.
- **List/Unlist Missions**: The ability for mission makers to manually list or unlist their own missions has been removed. Mission visibility is managed through the GitHub repository workflow.

### Mission Review Team & Admins (`Mission Reviewer`, `GM`, `Admin`)
- **Admin Controls Panel**: Access to a special modal on the mission list page with advanced controls.
    - **Trigger GitHub Sync**: Manually trigger a full or incremental sync of missions from the GitHub repository.
    - **Terrain Mapper**: Map terrain GUIDs to display names and images.
- **Edit Mission Metadata**: Can edit a mission's status, era, tags, mission group, and notes directly from the mission details page.
- **Manage Gameplay History**: Admins can add, edit, or remove entries from a mission's gameplay history.
- **Show Unlisted Missions**: Can toggle the visibility of all unlisted missions on the mission list page.
- **Delete any Media**: Can delete any media from any mission's gallery.

---

## 12. Discord User List Caching & Session Performance

### Overview
The gameplay history modal requires a full list of Discord server members to populate the "Select a leader" dropdown. Previously, this was fetched live from the Discord bot API on every page load, which was unreliable. The user list is now cached in MongoDB and refreshed on demand by GMs.
GMs also have the option to select "User not on discord" as the leader, this is used as an incentive for the player to join discord. If i allowed GMs to write a name, when that player joined discord entries would not be linked to the user.

Additionally, the NextAuth `session` callback previously called the Discord bot API on **every page load** to fetch fresh roles and nicknames. This caused authenticated pages to hang for 2+ minutes when the bot was unavailable. The session callback now reads exclusively from the database — no live bot API calls are made during normal page loads.

### How It Works
1.  **`discord_users` Collection:** Stores each Discord user's `userId`, `username`, `nickname`, `displayName`, `displayAvatarURL`, and `updatedAt` timestamp.
2.  **GM Controls Modal:** A "GM Controls" button (visible to GMs and Admins) on the Reforger missions list page opens a modal with a "Refresh Discord Users" button. When clicked, it calls the Discord bot API, fetches the full user list, and upserts all users into the `discord_users` collection. Avatars and nicknames are updated on each refresh.
3.  **Read from Database:** The leader selection dropdown on the Reforger mission detail page reads from the `discord_users` collection instead of calling the bot API directly. The history API also resolves leader names/avatars from the cache in a single batch query.
4.  **Stale Data Handling:** If a new Discord member joins and isn't in the cached list yet, a GM can hit the refresh button to pull the latest members. Users are upserted, never deleted, so previously assigned leaders remain valid.
5.  **Session Callback — Lazy Role Refresh:** The NextAuth session callback (`pages/api/auth/[...nextauth].ts`) uses a time-based lazy refresh. On each visit, it checks the `lastRoleRefresh` timestamp in the `users` record. If more than **24 hours** have passed, it makes a single `/users/:id` call (3s timeout) to fetch fresh roles and nickname, then persists them to the `users` table. All subsequent visits within that hour read instantly from the DB. If the bot is down, cached roles are used silently. This ensures roles stay reasonably fresh (e.g., GM promotions/demotions take effect within 24 hours - or the user can just relog) without impacting normal page load speed.
6.  **getServerSideProps:** The Reforger mission detail page uses `getServerSession` (server-side, no network round-trip) instead of `getSession` (which made a slow internal HTTP call).
Note: We might want an option for admins to force a user to be logged out. If a GM is demoted, and we want their powers removed instantly.


### Key Files
*   `pages/api/discord-users.ts` — GET (read cache) and POST (refresh from bot API) endpoint.
*   `components/modals/gm_controls_modal.tsx` — GM Controls modal with the refresh button.
*   `pages/reforger-missions/index.tsx` — GM Controls button on the mission list page.
*   `pages/reforger-missions/[uniqueName]/index.tsx` — Reads `discordUsers` from DB cache in `getServerSideProps`. Uses `getServerSession` for fast auth.
*   `pages/api/reforger-missions/[uniqueName]/history/index.ts` — Batch-resolves leader names/avatars from cache.
*   `pages/api/auth/[...nextauth].ts` — Session callback reads from DB only, no bot API calls.

### Migration
No data migration needed. The collection starts empty and is populated on first refresh.

### Known Issue: Guild-Specific Nicknames Not Returned
The Discord bot's `/users` endpoint (`discord-bot/src/users/users.controller.ts`) calls `gcGuild.members.fetch()` and returns the raw Discord.js `GuildMember` collection. When serialized, the `nickname` field (guild-specific server nickname) is often `null` even when the user has one set on the server. Only `displayName` (global Discord display name) comes through reliably.

**Example:** `http://globalconflicts.net:3001/users/106033743344451584` returns `"nickname": null` and `displayName: "bluebedouin"`, but the user's guild nickname is "Blue".

**Root cause:** Likely a Discord.js serialization issue — the raw `GuildMember` collection doesn't cleanly serialize `nickname` to JSON. The `/users` endpoint needs to explicitly map each member's fields (e.g., `member.nickname`, `member.displayName`, `member.displayAvatarURL()`) instead of returning the raw collection.

**Fix location:** `\discord-bot\src\users\users.controller.ts` — the `findAll()` method should map members to plain objects with explicit field extraction before returning.

---

## Temporary Files (Delete After Migration)

The following files and database collection were added for the one-time spreadsheet-to-database migration. They should be removed once the migration is complete.

### Files to Delete
- `pages/reforger-missions/migrate.tsx` — Migration mapping page
- `pages/api/reforger-missions/migration-spreadsheet.ts` — Spreadsheet fetch/parse API
- `pages/api/reforger-missions/migration-mappings.ts` — Mapping persistence API
- `pages/api/reforger-missions/migration-run.ts` — Destructive import API

### Database Collection to Drop
- `reforger_migration_mappings` — Stores missionId ↔ spreadsheetName links

### Revert in Existing Files
- `components/modals/admin_controls_modal.tsx` — Remove the "Spreadsheet Migration Tool" link and restore or remove the button as needed