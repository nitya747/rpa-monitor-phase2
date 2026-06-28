# High-Density Enterprise RPA Monitor — Implementation Plan

**Competition:** Phase 2 Specification — High-Density Enterprise RPA Monitor
**Date:** 28 June 2026 · 10:00 AM IST start · 10:00 PM IST submission deadline
**Core constraint:** Zero external data-grid or virtualization libraries (no AG-Grid, TanStack Table, react-window, react-virtualized). All row layout, structural rendering, and viewport optimization must be hand-built on raw framework mechanics or native Web APIs.

---

## 0. What this competition actually tests

Strip the RPA theming away and the real ask is: **build a custom virtualized table engine with a live-updating state core**, under a hidden performance budget.

The 100 feature points split into three buckets:

| Bucket | Features | Points |
|---|---|---|
| Hard engineering core | F8 (virtualized grid), F5 (pause/play + buffering), F9 (multi-column sort) | 35 |
| Data correctness & polish | F1–F4 | 35 |
| Filter / search / persistence | F6, F7, F10 | 25 |

On top of the 100 feature points, the rubric separately docks **up to 50 points** for memory leaks, heap bloat, layout thrashing, or unnecessary re-renders. A feature-complete but leaking app can still score badly — performance discipline has to be designed in from the start, not bolted on at the end.

### The one architectural decision everything else depends on

If the 500+ row dataset lives in component state and the UI re-renders on every 200ms batch, you get layout thrashing — exactly the penalty called out in the rubric. The fix is a **split architecture**:

- A **state engine** (plain JS class, outside the render tree) owns the canonical row data, sort state, filter state, and the pause/play buffer queue.
- The **virtualized grid** is a fixed pool of DOM row nodes (sized to the viewport) whose content is imperatively mutated on scroll/update — never React-rendered per row, per tick.
- **Lightweight widgets** (KPIs, alerts) can use normal reactive state since they're cheap — a handful of counters, not 500 rows.

```
dataStream.js (200ms batches)
        │
        ▼
  state engine (plain JS, outside render tree)
   ├─► buffer queue        → pause/play UI
   ├─► row recycling pool  → grid: mutate text on scroll, never re-render per row
   └─► reactive widgets    → KPIs/alerts: normal React state, cheap re-render
```

Only the row-recycling pool path touches the full dataset on every tick. Everything else either samples a summary of it or reacts to discrete events.

---

## Phase 0 — Setup & architecture spike

**Goal:** prove the risky part works before building any scored feature on top of it.

1. Scaffold the project (Vite + React, or vanilla — framework choice doesn't matter as long as the grid bypasses the reconciler).
2. Wire up `dataStream.js` via `window.initializeRpaStream(callback)`. Log incoming batches and confirm cadence (~200ms) and shape against the columns in `rpa_database_2026.csv`.
3. Build the **state engine skeleton**:
   - `rows: Map<project_id, row>` — keyed for O(1) upsert.
   - `subscribers` — callback list for summary/widget updates.
   - `applyBatch(batch)` — upserts rows, updates running totals.
   - `getVisibleSlice(startIndex, count)` — stub for the grid to call.
4. Build a throwaway 20-row table that proves: batch arrives → engine updates → nothing in the render tree re-renders except a row counter.
5. Stress-test the spike manually with ~2000 synthetic rows before moving on.

**Exit criteria:** the engine absorbs rapid batches without the UI re-rendering per-row. If this doesn't hold, fix it now — every later feature compounds on top of it.

---

## Phase 1 — Core data pipeline & KPIs

**Covers:** Feature 1 (High-Density KPIs Dashboard, 10 pts), Feature 2 (Financial & Numeric Value Sanitation, 10 pts)

- Finalize `applyBatch`: upsert by `project_id`, and maintain **running totals incrementally** (`totalRowsProcessed`, `activeRobotsDeployed` sum, `globalCumulativeSavings` sum). Never recompute by scanning all rows on every tick — that's O(n) paid 5×/second for nothing.
- KPI strip subscribes to a throttled "totals changed" event; this can safely use `useState` since it's three numbers, not 500 rows.
- Build the **sanitizer module once**, reused everywhere (grid cells and KPIs both depend on it):
  - `formatCurrency(usd)` — locale-aware thousands separators.
  - `clampPercent(p)` — round to 2 decimal places, clamp to valid range.
- Guardrail check: counters must increment every 200ms without breaking layout or lagging — verify visually under streaming load, not just in isolation.

---

## Phase 2 — The virtualized grid (build before anything that depends on it)

**Covers:** Feature 8 (High-Frequency Virtualized DOM Grid, 15 pts)

This is the highest point value and the foundation for sorting, filtering, alerts, and search — build it immediately after the pipeline, before those dependent features.

- Compute a **fixed row pool size**: `visibleRowCount = ceil(viewportHeight / rowHeight) + buffer(2–3)`. Create exactly that many DOM row elements once, at mount.
- On scroll: compute `startIndex = floor(scrollTop / rowHeight)`, slice the current sorted/filtered index array, and **mutate existing node content** (`textContent`, classes) — never create or destroy nodes per scroll event.
- Use a tall spacer element (`height = totalRows * rowHeight`) so the native scrollbar behaves correctly; position the row pool absolutely/with `transform` inside it.
- Throttle scroll handling via `requestAnimationFrame`, not raw scroll events.
- Load-test with 500+ synthetic rows immediately and open the Chrome Performance tab now — don't wait until the final hardening pass to discover a leak here.

**Exit criteria:** DOM node count for grid rows stays constant regardless of total dataset size or scroll position; confirmed via `document.querySelectorAll('.grid-row').length` staying flat.

---

## Phase 3 — Status alerts & buffer control

**Covers:** Feature 3 (Visual System Alert & Status Indicators, 10 pts), Feature 5 (Pipeline Buffer Control / Pause-Play, 10 pts)

- **Feature 3:** flash via CSS class toggle (`classList.add('flash-warning')`) with an `animationend` listener to auto-remove the class. Never use `setTimeout` for this — an uncleared timeout under rapid updates is a direct leak source the rubric is watching for.
- **Feature 5** is the trickiest correctness feature in the spec:
  - `dataStream.js` keeps firing its 200ms callback regardless of UI state — you cannot stop it, only choose what to do with its output.
  - **Pause** = the engine stops forwarding batches to the grid/visible state, but keeps appending incoming batches to an internal buffer queue, in order.
  - **Play** = drain the queue into the engine in original order, then resume live forwarding.
  - Keep the engine and grid decoupled enough that "paused" is a flag the engine checks before notifying subscribers — not something that touches the data source itself.

**Exit criteria:** pause for 10+ seconds during active streaming, then play — zero rows dropped or skipped, queue drains in original order.

---

## Phase 4 — Sorting

**Covers:** Feature 4 (Single-Column Telemetry Sorter, 10 pts), Feature 9 (Multi-Column Concurrent Sorter, 10 pts)

- Build the **general case first** (Feature 9, multi-column). Feature 4 (single-column) is just a one-element version of the same comparator — don't build two separate sorters.
- Maintain sort state as an ordered array of `{field, direction}` pairs. Shift-click pushes or updates entries in this array.
- **Guardrail:** sort order must survive the 200ms injection tick without locking the UI.
  - Avoid re-sorting the full array from scratch on every batch if avoidable.
  - At this dataset scale, a stable `Array.prototype.sort` re-applied per tick is acceptable — just avoid anything O(n²) per row (e.g., re-sorting via repeated linear scans).
  - Re-sort is only needed when the comparator changes *or* a batch lands; don't sort on unrelated state updates.

**Exit criteria:** shift-click multi-sort (e.g., industry ascending, then ROI% descending) holds correctly while new rows stream in.

---

## Phase 5 — Filters, search & layout persistence

**Covers:** Feature 6 (Operator Workspace Layout Persistence, 10 pts), Feature 7 (Categorical Dropdown Filters, 10 pts), Feature 10 (Multi-Field Fuzzy Search Engine, 5 pts)

- **Features 7 & 10** both reduce to the same pattern: maintain a `predicate(row) => boolean` per active filter/search term, compose all active predicates, and recompute a **filtered index array** (not a copy of row objects) whenever a predicate changes or a batch arrives.
- **Feature 10** (fuzzy, out-of-order, multi-field): split the query into tokens; require all tokens to match somewhere across the concatenated searchable fields, in any order. This satisfies "out-of-order partial string" matching without needing a real fuzzy-matching library.
- **Feature 6** (layout persistence): this is the one legitimate use of `localStorage` in the whole app — it's small (a handful of boolean flags) and outside the hot data path. Read on mount, write on toggle. Confirm a hard refresh preserves exact panel visibility state.

**Exit criteria:** typing a multi-token fuzzy query under active streaming doesn't stutter the UI thread; dropdown filter + search compose correctly together.

---

## Phase 6 — Hardening pass (the hidden 50 points)

This bucket is worth as much as half the feature points combined — budget real time for it, don't treat it as a final five-minute check.

- Open Chrome Performance tab, record 30+ seconds of live streaming under combined load (sorting + filtering + scrolling simultaneously). Look for:
  - Detached DOM nodes.
  - Heap growth between two snapshots taken minutes apart (true leak signal, not GC noise).
  - Forced reflow / layout thrashing warnings.
- Audit every `setInterval`, `setTimeout`, and event listener for a matching cleanup (`useEffect` return, `removeEventListener`, `clearInterval`).
- Re-confirm the grid's DOM node count stays constant during a long stress run, not just at initial load.
- If using React, check DevTools "highlight updates" to confirm KPI/widget re-renders aren't cascading into the grid container.

**Exit criteria:** a 5+ minute streaming session under combined sort/filter/search/scroll shows flat heap growth and constant grid node count.

---

## Phase 7 — Packaging & submission

- **Modular file structure** — the spec explicitly disqualifies dumping the app into a single file. Separate the state engine, grid component, filters, search, and KPI widgets into their own modules.
- Deploy publicly (Vercel/Netlify) and verify the link loads with **no auth wall**.
- Push to a **public** GitHub repo that matches the deployed code exactly (mismatch is an explicit disqualification criterion).
- Record the walkthrough video **last**, after the final stress test — narrate the architecture decisions from Phase 0 (engine vs. render-tree split, row recycling, buffer queue) since that's precisely what the judging rubric weighs.

---

## Disqualification checklist (verify before submitting)

- [ ] GitHub repo is public and loads (no 404)
- [ ] Deployment is public, loads without auth, and is stable under evaluation load
- [ ] Repo code matches deployed app
- [ ] No AG-Grid / TanStack Table / react-window / react-virtualized (or equivalent) anywhere in dependencies
- [ ] Codebase is modular — not a single monolithic file
- [ ] All three submission artifacts included: GitHub link, live deployment link, walkthrough video

---

If working as a team, Phases 4 and 5 can parallelize against Phases 2 and 3 once the state engine's public interface (`applyBatch`, `getVisibleSlice`, subscriber model) is locked — those features depend on the engine's shape, not on each other's implementation.
