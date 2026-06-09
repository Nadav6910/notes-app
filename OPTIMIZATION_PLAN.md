# Notes App — Complete Optimization Plan

A full-stack performance, architecture, and UI/UX upgrade plan to bring the app to industry-standard quality: fast first paint, instant interactions, efficient database access, a lean bundle, and a high-end visual feel.

The plan is organized into 7 phases, ordered by impact-per-effort. Each item lists the file(s) involved and the concrete change. Phases 0–2 alone should transform perceived speed.

---

## Phase 0 — Correctness & security fixes (do first, they're quick)

These aren't optional polish; some are exploitable today and some silently hurt performance.

### 0.1 Missing ownership check on the note page
`src/app/my-notes/note/[noteId]/page.tsx:31-34` fetches `getNoteEntries(noteId)` after only checking that *a* session exists. Any logged-in user can read any other user's note by guessing/sharing a noteId.

**Fix:** add `userId` to the query filter so the fetch and the authorization are a single DB call:

```ts
// lib/fetchers.ts
export const getNoteEntries = cache(async (noteId: string, userId: string) => {
    return prisma.note.findUnique({
        where: { noteId, userId },   // ownership enforced in the query
        select: { ... }
    })
})
```
Return `notFound()` when null.

### 0.2 `/api/change-notes-view` has no auth and trusts a client-sent userId
`src/app/api/change-notes-view/route.ts:7-19` — anyone can POST any `userId` and mutate that user's record. **Fix:** call `requireAuth()` (it already exists in `src/lib/auth.ts`) and use `session.user.id`; stop sending `userId` from `MyNotesList.tsx:67`.

### 0.3 Prisma query logging enabled in production
`src/prisma.ts:10` — `log: ['query']` logs every query (latency + log noise + leaks data into logs).

```ts
new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
})
```

### 0.4 Error messages leak internals
~15 API routes do `return NextResponse.json({error: error.message}, {status: 500})` and `console.log(error)`. Return a generic message to the client; log structured errors server-side (see Phase 5.5). Also `change-notes-view` returns errors with **status 200** — fix the status code.

### 0.5 Rate limiting only on scraper routes
`src/lib/rate-limit.ts` is applied to the two scraper endpoints but not to note CRUD (`create-note`, `create-note-item`, `register`, etc.). Add modest limits to mutation routes — especially `/api/register` (brute-force/bot signups) and `/api/upload-profile-image`.

---

## Phase 1 — Database layer (biggest backend wins)

### 1.1 Add MongoDB indexes (highest-impact single change)
`prisma/schema.prisma` defines no indexes. Every `getNotes` and `getNoteEntries` call is a collection scan today.

```prisma
model Note {
  ...
  @@index([userId, createdAt(sort: Desc)])  // getNotes: filter by user, sort by date
}

model Entry {
  ...
  @@index([noteId, createdAt(sort: Desc)])  // getNoteEntries: filter by note, sort by date
}
```
Apply with `npx prisma db push`. This is O(collection) → O(log n) on the two hottest queries.

### 1.2 Collapse the two `my-notes` queries into one
`src/app/my-notes/page.tsx:22-25` runs `getNotes` + `getUserNotesView` — two `user.findUnique` calls on the same document. Merge into a single fetcher that selects `notesView` *and* `notes` in one round trip.

### 1.3 Add `select` to entry fetches
`src/lib/fetchers.ts:55-59` (`getNoteEntries`) fetches full `Entry` documents with no `select`. For "Items list" notes that's fine-ish, but for notebooks the `item` field holds the entire Tiptap HTML. Select only the fields each note type needs (split into `getNoteItems` / `getNotebookContent` fetchers).

### 1.4 Make ownership checks atomic (halve mutation round trips)
Every mutation route does `verifyEntryOwnership()` (1 query) then the mutation (2nd query) — `src/app/api/delete-note-item/route.ts:21-36` and friends. Combine into one atomic query using relation filters:

```ts
const result = await prisma.entry.deleteMany({
  where: { entryId, note: { userId: session.user.id } }
})
if (result.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
```
Same pattern with `updateMany` for rename/priority/category/isChecked routes. One round trip, no TOCTOU race.

### 1.5 Don't block API responses on Ably publish
Routes like `delete-note-item/route.ts:40` `await channel.publish(...)` before responding. The user's own UI doesn't need the echo (`echoMessages: false`). Fire-and-forget (or `event.waitUntil` / `after()` on Next 15) and respond immediately — saves ~50–200ms per mutation.

### 1.6 Validate payload sizes
`save-notebook/route.ts` accepts unbounded `itemName` HTML (MongoDB doc limit is 16MB — a huge note will hard-fail). Reject payloads over a sane limit (e.g. 1–2MB) with a clear error, and surface it via the save-status indicator.

---

## Phase 2 — Server rendering, caching & navigation

### 2.1 Stop client-only rendering of content the server already has
This is the single biggest *perceived speed* problem:

- `MyNotesList.tsx:13-21` loads `NoteCard`/`NoteCardListView` via `dynamic(..., { ssr: false })`. The server fetched the notes, then ships skeletons and renders the cards client-side. LCP waits for the full JS bundle.
- Same for the note page: `[noteId]/page.tsx:11-19` has `ssr: false` on both `NoteItemsList` and `NoteBook`.

**Fix:** remove `ssr: false` for the cards (they're simple presentational components — server-render them; keep `dynamic()` only for code-splitting). For the Tiptap `NoteBook`, keep the editor client-side but server-render the page shell, title, and a read-only HTML preview of the content (`dangerouslySetInnerHTML` of the stored HTML inside the skeleton) so the user sees their note instantly while the editor hydrates.

### 2.2 Add `loading.tsx` route segments
No `loading.tsx` exists anywhere. Add them for `/my-notes` and `/my-notes/note/[noteId]` (reuse the existing skeleton components). Navigation then streams the shell immediately instead of blocking on `getServerSession` + DB.

### 2.3 Cache the session lookup per request
`getServerSession(authOptions)` is called fresh in every page/route. Wrap it once:

```ts
// lib/auth.ts
import { cache } from 'react'
export const getSession = cache(() => getServerSession(authOptions))
```

### 2.4 Add `middleware.ts` for route protection
No middleware exists; every page does session-check-then-`redirect('/')`, which means the server renders the page before bouncing. Use `next-auth/middleware` (`getToken` — JWT check, no DB hit) to protect `/my-notes/:path*` and `/profile` at the edge. Keep ownership checks in routes; middleware handles "is logged in at all".

### 2.5 Replace blanket `router.refresh()` with local state + targeted revalidation
`router.refresh()` after every mutation re-runs the whole RSC tree and refetches everything (NoteItemsList.tsx lines ~351, 384, 445, 561, 579, 665; CreateNote.tsx; MyNotesList flows). On a 500-item note, checking one checkbox refetches the entire note.

- The component already maintains `noteItemsState` — mutations should update local state (most already do) and **drop the refresh entirely**; Ably keeps other clients in sync.
- Where the server cache must be invalidated (create/delete/rename note), migrate the API routes to **Server Actions** (or keep routes and call `revalidatePath('/my-notes')` inside them) so invalidation is targeted instead of client-driven.
- `CreateNote.tsx:50-57`: `router.push('/my-notes')` followed by `router.refresh()` is redundant + a hardcoded 400ms `setTimeout`. Use `revalidatePath` in the route and just `push`.

### 2.6 Adopt optimistic updates for item mutations
Check/uncheck, priority, category, rename are perfect `useOptimistic`/optimistic-state candidates: flip the UI instantly, roll back on error (the soft-delete undo pattern in `handleSoftDelete` already proves the codebase can do this). Target: **0ms perceived latency** on every item interaction.

---

## Phase 3 — React rendering performance

### 3.1 Break up `NoteItemsList.tsx` (1,382 lines)
The component holds ~17 `useState` values; any keystroke in the search box re-renders everything including the grouped accordion tree.

- Extract **popups** (Add/Delete/Rename) with their `selectedEntry*` state into a single `useItemPopups` hook or sibling components — popup open/close should not re-render the list.
- Extract **filter/sort controls** into a component that owns `searchTerm`/`filterByChecked`/`filterByCategory`/`sortMethod` and passes one derived `filteredItems` down — or move that state into a reducer.
- Fix `itemsCategories` (lines ~141-150): it's computed from the initial `noteEntries` prop, so newly added categories never appear in the selector. Derive from `noteItemsState`.

### 3.2 Virtualize the items list
`filteredNoteItems.map(...)` renders every item to the DOM. Add windowing with `@tanstack/react-virtual` (works with the existing scroll container) once lists exceed ~100 items; below that render normally so animations stay intact.

### 3.3 Keep `NoteListItem` memo-effective
`NoteListItem` is already `memo()`-wrapped — make it pay off:
- Ensure all callbacks passed to it (`onCheck`, `onDelete`, `onRename`, …) are `useCallback`-stable with stable deps (use functional `setState` so handlers don't depend on `noteItemsState`).
- Pass primitive props (`entryId`, `item`, `isChecked`, `priority`, `category`) instead of the whole entry object where possible, so unrelated item updates don't bust memoization.

### 3.4 Tame framer-motion costs
- `AnimatePresence` per accordion group (`NoteItemsList.tsx` ~1014-1127) re-evaluates all groups on every expansion. Hoist a single `AnimatePresence` and memoize each group component.
- Remove `layout` prop from `MyNotesList.tsx:106` card wrappers unless reordering actually animates — `layout` measures every card on every render.
- Add `prefers-reduced-motion` support globally (also a UX/accessibility win, see Phase 6).

### 3.5 NoteBook editor effects
- `NoteBook.tsx` ~212-258: the ResizeObserver/MutationObserver effect re-runs on every `editor` update. Key it to the editor instance only, not state that changes per keystroke.
- Scroll listener (~472-489) re-attaches on every `isButtonVisible` flip — use a ref for visibility and attach once.

---

## Phase 4 — Bundle size & assets

### 4.1 Dependency cleanup (free wins)
- **Remove `puppeteer`** (~150MB install; `puppeteer-core` + `@sparticuz/chromium` is the correct serverless pair already present) — `package.json`.
- **Remove `lottie-react`** — never imported anywhere.
- Remove `eslint`/`@types/*`/`typescript` from `dependencies` → `devDependencies`.

### 4.2 Package import optimization
`next.config.js`: add

```js
experimental: {
  optimizePackageImports: ['@mui/material', 'react-icons', 'framer-motion'],
}
```
Barrel imports from `@mui/material` and 60+ `react-icons` imports currently inflate compile + bundle. (On upgrade to Next 15 some of this is default.)

### 4.3 Lazy-load below-the-fold / on-interaction code
- All popups/modals (`AddNoteItemPopup`, `ConfirmDeleteNotePopup`, `RenameNotePopup`, `RenameNoteItemPopup`, `DeleteNoteItemPopup`, `ColorPicker`) → `next/dynamic` on first open.
- `lowlight` + `@tiptap/extension-code-block-lowlight` registers full syntax highlighting up front — register only common languages (`lowlight/lib/common`) or lazy-load grammars.

### 4.4 Fix the font conflict (currently shipping a dead font)
`layout.tsx` applies `inter.className`, but `globals.css:43-48` overrides every element with a system-font stack using `!important` — **Inter is downloaded and never rendered.** Pick one:
- Keep Inter (recommended for the "high-end" look): set `--font-sans: var(--font-inter)` via `next/font`'s `variable` option and delete the `!important` override.
- Or drop Inter from `fonts.ts` and save the font bytes.

### 4.5 Images
No `next/image` usage; profile avatars are raw `<img>`/MUI Avatar. Use `next/image` for user-uploaded profile images (resizing, WebP/AVIF, lazy loading) and add `images.remotePatterns` to `next.config.js` if they're remote.

### 4.6 Measure
Add `@next/bundle-analyzer` and a `npm run analyze` script; set a budget (e.g., first-load JS < 150kB on `/my-notes`) and check it in CI.

---

## Phase 5 — API & infrastructure

### 5.1 Cache headers on cacheable GETs
Scraper endpoints (`get-product-prices`, `auto-complete-products-search`) return data already cached server-side in a Map — add `Cache-Control: private, max-age=300, stale-while-revalidate=600` so repeat lookups don't even hit the server.

### 5.2 Distributed rate limiting
`src/lib/rate-limit.ts` uses an in-process `Map` — correct interface, but per-instance on serverless (N instances = N× the limit). Swap the store for Upstash Redis / Vercel KV behind the same function signature.

### 5.3 Scraper hardening
- LRU eviction does a full linear scan per insert when at capacity — keep a separate insertion-order structure or accept eviction of *any* expired entry first.
- The module-level `lock` can wedge all future requests if a request dies mid-lock — wrap in `try/finally` (verify) and add a lock timeout.
- Add a hard browser max-lifetime/restart to avoid memory creep in long-lived instances.

### 5.4 Ably lifecycle
- `useChannelOccupancy.ts`: channel ref is captured once (`useRef(ably.channels.get(channelName))`) while the effect depends on `channelName` — navigating between notes leaks the old channel. Derive the channel inside the effect and `channel.detach()` on cleanup.
- Instantiate the Realtime client lazily on first authenticated use (module-level instantiation in `Ably.ts` connects even for visitors who never open a note).

### 5.5 Structured logging
Replace 35+ `console.log(error)` calls with a tiny logger util (level-aware, JSON in production) — or wire Sentry. Required for diagnosing the perf work above in production.

### 5.6 Optional platform upgrade
Next 14 → **Next 15 + React 19** unlocks: stable `after()` (perfect for the Ably publishes), built-in `optimizePackageImports` defaults, faster dev/build, `useOptimistic` improvements. Medium effort; do after Phases 0–2 land.

---

## Phase 6 — UI/UX: making it feel professional & high-end

The app already has good bones (theming, skeletons, motion, undo-delete). What separates it from a polished product is **consistency and restraint**.

### 6.1 Design-token system
`globals.css` variables are ad-hoc hex values with alpha suffixes (`#c2c1c117`, `#8484844f`) and the brand color flips identity between themes (teal `#19a29b` in dark, purple `#610c62` in light). Define a real token scale and use it everywhere:

```css
:root {
  /* brand — same hue both themes, adjusted lightness */
  --brand-50…--brand-900;
  /* semantic */
  --surface-0/1/2;  --text-primary/secondary/muted;
  --border-subtle/default;  --danger; --success; --warning;
  /* scales */
  --radius-sm/md/lg;  --shadow-1/2/3;  --space-1…8;
}
```
One brand hue across light/dark instantly makes the app feel like one product. Audit MUI's theme (`ThemeProv`) to consume the same tokens so MUI components and CSS modules stop diverging.

### 6.2 Typography hierarchy
Pick a type scale (e.g., 12/14/16/20/24/32 with two weights) and apply it. The hero uses an `<h5>` styled as a giant header (`page.tsx:15`) — fix heading semantics while at it. Keeping Inter (Phase 4.4) with `font-feature-settings: 'cv11', 'ss01'` and tight letter-spacing on headings gives the modern SaaS look.

### 6.3 Motion polish (less, but better)
- Standardize durations/easings: 150ms for hovers, 200–250ms `ease-out` for entrances, springs only for drag.
- Stagger card entrance is good — cap `staggerChildren` total (delay = `min(i, 10) * 0.05`) so 50 notes don't take 4s to appear.
- Respect `prefers-reduced-motion` via a global `MotionConfig reducedMotion="user"` wrapper.
- Add **View Transitions** for page navigation (card → note page morph) — cheap to add, feels premium.

### 6.4 Micro-interactions & feedback
- Unify snackbars/toasts into one app-level toast provider (currently scattered per-component state: `showUserEntered`, `showUndoSnackbar`, success popups…). One consistent position, animation, and dismiss behavior.
- Button press states (`scale: 0.98` on tap), checkbox check animation already exists — keep.
- The save-status indicator in the editor is great; surface the same "Saved · 2m ago" pattern after list mutations.

### 6.5 Perceived performance = premium feel
- Optimistic updates everywhere (Phase 2.6) — nothing says "cheap app" like a spinner on a checkbox.
- Skeletons should match final layout dimensions exactly to avoid layout shift (audit `CardLoadingSkeleton` vs `NoteCard` heights; CLS is a Core Web Vital).
- Preload on hover: `router.prefetch` fires automatically with `<Link>`, so replace any programmatic `router.push` navigations triggered by clicks on cards with `<Link>` for instant nav.

### 6.6 Power-user features (high-end signal)
- **Cmd/Ctrl+K command palette**: jump to note, create note, toggle theme. (Lazy-loaded, ~5kB with `cmdk`.)
- Global search across notes (server route + debounced input — `useDebouncedValue` already exists).
- Keyboard shortcuts on the note page (the editor already has save-shortcut wiring; extend: `n` new item, `/` focus search).

### 6.7 Accessibility (table stakes for "industry standard")
- Visible `:focus-visible` rings using the brand color.
- Verify contrast of muted text/borders tokens (several current grays on the dark gradient fail WCAG AA).
- `aria-label`s on the icon-only buttons (view-switch, sort, delete).
- The swipe-to-delete gesture needs a non-gesture alternative (it has buttons — confirm they're keyboard-reachable).

### 6.8 Visual details checklist
- Consistent border radii + a single elevation system (cards currently mix several backgrounds/alphas).
- Subtle 1px borders + soft shadows on cards instead of flat alpha backgrounds (premium feel in dark mode).
- Custom thin scrollbars (`scrollbar-width: thin` + `::-webkit-scrollbar`), themed.
- Empty states: `NoNotesDisplay` exists — give filtered-to-empty and search-no-results states the same care.
- A real footer or remove the dead commented `AppFooter` import in `layout.tsx`.

---

## Measurement & rollout

1. **Baseline first**: Lighthouse (mobile) on `/`, `/my-notes`, a note page; `@next/bundle-analyzer` snapshot; note current first-load JS sizes.
2. Land phases in order; re-measure after Phases 1, 2, and 4.
3. Add Vercel Speed Insights / `useReportWebVitals` to track LCP, INP, CLS in production.
4. Targets:
   - LCP < 1.8s mobile on `/my-notes`
   - INP < 200ms (optimistic updates get item toggles to ~0 perceived)
   - First-load JS < 150kB on list pages; editor chunk lazy-loaded only on notebook pages
   - All DB queries index-backed (verify with MongoDB `explain`)

## Suggested order of execution

| Step | Items | Effort | Impact |
|------|-------|--------|--------|
| 1 | Phase 0 (security/correctness) | ~½ day | Critical |
| 2 | 1.1 indexes, 1.2 merged query, 4.1 dep cleanup, 4.4 font fix | ~½ day | High |
| 3 | 2.1 remove `ssr:false`, 2.2 loading.tsx, 2.3 session cache, 2.4 middleware | 1 day | High (perceived speed) |
| 4 | 2.5–2.6 refresh→optimistic, 1.4 atomic mutations, 1.5 non-blocking Ably | 1–2 days | High (interaction speed) |
| 5 | Phase 3 (NoteItemsList refactor + virtualization) | 2–3 days | High for large notes |
| 6 | Phase 4 rest + Phase 5 | 1–2 days | Medium |
| 7 | Phase 6 UI system + polish | 2–4 days | High (product feel) |
