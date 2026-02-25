# Mission Library Stats Dashboard
**Date:** 2026-02-20
**File changed:** `pages/reforger-missions/index.tsx`

---

## ⚠️ Server Admin: Action Required on Deploy

**Two new npm packages were added.** After pulling this branch, run:

```
npm install
```

This will install:
- `apexcharts` ^5.6.0
- `react-apexcharts` ^2.0.1

The site will **fail to build** if these are not installed before running `npm run build`.

---

## What Changed

### New: Stats Dashboard panel on the Reforger Missions page

A **"Stats" button** has been added to the header row on `/reforger-missions` (left of GM Controls). Clicking it toggles a collapsible stats panel directly above the filters.

---

### Summary pills

Five stat pills showing live counts:
- **Missions** — total in the library (updates when type filter is active)
- **Total Plays** — sum of play counts
- **Most Played** — mission name + play count
- **Terrains** — number of unique terrains
- **Authors** — number of unique authors

All pills update when a Mission Type filter is active. The Missions pill shows "of X total" when filtered.

---

### Mission Type — interactive donut with cross-filter

The Mission Type panel is an ApexCharts donut chart. **Clicking a slice filters the entire dashboard** — all other charts, bar charts, and stat pills update to show only missions of that type. Click the same slice again (or the "clear" link) to remove the filter.

Consistent colours across all charts:

| Type | Colour |
|---|---|
| TVT | Blood red `#991b1b` |
| COTVT | Yellow `#facc15` |
| COOP | Green `#22c55e` |
| LOL | Purple `#a855f7` |
| SEED | Blue `#3b82f6` |
| OTHER | Grey `#6b7280` |

---

### Bar charts (respond to Mission Type filter)

- **Top Terrains** — top 8 terrains by mission count
- **Era** — distribution across historical eras
- **Mission Tags** — top 10 tags by usage

---

### ApexCharts analytics

| Chart | Type | Notes |
|---|---|---|
| **Missions Supporting Each Player Count** | Stacked area | COOP / COTVT / TVT coverage per player count 2–130. Excludes Unavailable missions. |
| **Last Played by Max Player Count** | Scatter | Each dot = one mission. X = max slots (capped at 128), Y = last played date. Hover for name + date. |
| **Player Count Ranges** | Floating bar | Each bar = one mission, min → max slots (capped at 128), sorted by min. Hover for name + range. |
| **Last Played Heatmap by Player Count & Year** | Heatmap | Rows = years, columns = max-slot buckets (10-player bands). Cell colour = mission count. |
| **Missions Added Over Time** | Stacked bar | Monthly new missions by type. Always shows all missions regardless of type filter. |
| **Play Activity by Week** | Stacked bar | Last 10 weeks, Tuesday–Monday boundary (covers Fri/Sat/Sun/Mon sessions). X-axis shows ISO week numbers (hover for date range). TVT / COTVT / COOP / LOL only. Respects type filter. |

---

### Author Contributions

**Podium** (top 3 authors by missions made):
- Displayed in Olympic layout — 2nd left, 1st centre, 3rd right
- Gold / silver / bronze step heights and colours
- Shows name, mission count, and total plays under each step

**Bar + line chart** (all remaining authors, 4th place down):
- Bars = Missions Made (left y-axis, indigo)
- Line = Total Plays (right y-axis, amber) — independent scale avoids outlier distortion
- Authors sorted by missions made, descending

---

### Bug fix: SEED type normalisation

The sync pipeline converts mission prefixes `SD` and `AAS` to `SEED` at import time, but older database records may still carry the raw prefix. The dashboard and the Type filter dropdown now normalise `SD`/`AAS` → `SEED` on the client, so these missions are correctly counted and filterable everywhere.

**SEED** has also been added to the Type filter dropdown.

---

### Implementation notes
- All data is computed client-side from the `missions` prop already loaded at page render — **no additional database queries or API calls**, zero impact on page load time.
- ApexCharts is loaded with `dynamic(() => import(...), { ssr: false })` to avoid server-side rendering issues with `window`.
- Chart backgrounds are transparent; axis/grid colours are fixed to match the dark panel (`#374151` grid, `#9ca3af` labels) regardless of light/dark mode.
- A `normalizeType(raw)` helper is defined at module level and used throughout all type comparisons in the dashboard and filter logic.
