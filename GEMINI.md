# Project Invariants & Mandates

## Core Configuration Protection
- **CRITICAL INVARIANT:** The `DEFAULT_CONFIG` in `src/store.tsx`, specifically the `daily_questions` array, is the single source of truth for user historical data. 
- **DO NOT** remove, rename, or re-order the following question IDs: `driver`, `frame`, `ego`, `outlook`, `relational`, `ram`, `gratitude`, `boundary`, `responsibility`, `agency`.
- Removing or changing these IDs will cause permanent loss of visibility for user historical stats.
- Any modification to `DEFAULT_CONFIG` must be explicitly requested and verified against existing data schemas.

## Technical Standards
- **High-DPI Scaling:** All canvas elements must implement `devicePixelRatio` scaling to ensure visual clarity on mobile devices.
- **Scroll Locking:** Modals and full-screen activation modules must implement body-scroll locking.
- **Deletions:** All destructive actions (deleting instances, mottos, categories) must have a mandatory confirmation dialog.
- **Mobile First:** The application is primary used on mobile. Visual layout must prioritize narrow screen widths (max-width: 448px).
