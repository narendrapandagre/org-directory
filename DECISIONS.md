# DECISIONS.md

Short, bullet-first. Each item: what I chose, what I rejected, why.

## AI-tool declaration

- Used an AI assistant (Claude) to scaffold this project end-to-end: project structure, the mock API/rate-limiter, the normaliser, the store, the create form, and this file.
- I can defend every line — the reasoning for each non-obvious decision is written below, not just "the AI did it."
- Rejected: pretending no AI was used. The brief explicitly allows and expects declared AI use.

## Conflict 1 — "no pagination" vs. "25/request, 5 req/min"

**Chose:** the UI never paginates (no page-number clicks, no "load more" button). Underneath, `OrganisationStore.loadAll()` fetches every page of 25 through a `SlidingWindowRateLimiter` capped at 5 requests/minute, appending results to one continuous signal-backed array as they arrive. The user sees a single progress indicator ("Loading… 75 of 137") instead of a spinner-then-nothing.

**Rejected:**
- Real pagination UI (satisfies the API cleanly but directly violates "we hate clicking").
- Fetching all 137 in one unbounded request (violates the stated 25-record cap; not how the real API would behave).
- Ignoring the rate limit and firing all 6 requests at once (would 429 in a real system).

**What I gave up:** with 137 records / 25 per page = 6 requests needed but only 5 allowed per minute, the 6th request has to wait for the window to free up. On a cold load this means the last ~25 rows can take noticeably longer to appear (up to ~60s worst case). I show partial data immediately and keep loading in the background rather than blocking the whole screen — that felt like the better trade for "we hate waiting" than a blank screen for a full minute.

## Conflict 2 — colour-only dot vs. "never colour alone"

**Chose:** kept the designer's dot, but always paired it with a text label (`<StatusBadgeComponent>`: dot + `{{ 'status.active' | t }}` etc.), both inside one pill. Colour reinforces the status for people who see colour; the word carries the same information for everyone else (colour-blind users, screalidn readers via the visible text, printed screenshots, etc.).

**Rejected:**
- Dot only (fails the accessibility standard outright — this isn't a close call, WCAG 1.4.1 is explicit that colour cannot be the only indicator).
- Text only, no dot (throws away a real, valid piece of the designer's intent — the dot still adds fast visual scanning for sighted users).

**What I gave up:** the table is very slightly busier than a pure-dot design. I considered a dot + icon (no text) but rejected it — icons still need a text alternative to be robust across languages (FR5), so a text label was the more consistent choice given the whole app already lives on one translation file.

## Data normalisation (the messiest part)

All normalisation lives in one pure module, `organisation-normalizer.ts`, called once per raw row. Nothing else in the app touches raw fixture shapes.

- **Blank/null `name`** (ids 2, 3): shown as an italic "(unnamed organisation)" placeholder rather than hidden or defaulted to something invented. Sorts to the bottom regardless of sort direction, so it's never lost, never dominant.
- **Mixed-case / typo status** (`"ACTIVE"`, `"Active"`, `"actve"`): normalised through a lower-cased lookup map. `"actve"` is mapped to `active` because it reads as a typo of a known value, not a fourth genuine status — documented explicitly in code so a reviewer can disagree with that specific call.
- **Anything else unrecognised or missing status** → `unknown`, shown as its own visually distinct (amber) badge rather than silently defaulting to `active`. Defaulting an unknown status to "active" felt like the wrong failure mode for an ops tool — you'd rather a record announce "I don't know what I am" than confidently lie.
- **`memberCount` as a string** (`"12"`), **negative** (`-1`), or **null**: coerced to a number when possible; negative values are treated as "not a real count" (`null`) rather than displayed as `-1`, since a negative member count isn't meaningful. Shown as `—` when null, never as `NaN` or a literal `-1`.
- **Missing `owner`** (id 3) or **invalid email** (`"not-an-email"`, id 8): shown as `—` when absent; shown but visually flagged (underlined, distinct colour) when present-but-invalid, so ops can still see and act on the raw value instead of it disappearing.
- **Bad/missing `createdAt`** (`"not a date"`, `""`, `null`, and the epoch-millis variant on id 2): parsed defensively; anything that doesn't produce a valid `Date` renders as `—` and sorts as the earliest possible value, rather than crashing `Date` formatting or showing "Invalid Date" to the user.
- **Duplicate id 42** (`Globex Corporation` / `Globex Corporation Ltd`): both rows are kept and shown — deleting one would be guessing which is "correct" without evidence. Each duplicate gets a small "Duplicate ID" pill with a tooltip explaining why, so ops knows to go verify with the source system rather than assuming the UI merged them safely.
- **Very long name** (id 7): allowed to wrap (`overflow-wrap: anywhere`) inside a max-width cell rather than being truncated with an ellipsis — truncating a name silently changes what ops thinks the organisation is called.
- **Non-Latin / emoji name** (`شركة الأمل 🚀`): no special-casing needed — everything is plain UTF-8 strings end to end, which is really a decision *not* to add Latin-only assumptions anywhere (no regex like `[a-zA-Z]` on names, ever).

## FR3 — form validation UX

- Field errors appear on **blur** (`control.touched`), not on every keystroke, per the brief. Re-validation still happens live underneath (e.g. the uniqueness check), it's just not *displayed* until the field has been visited or a submit was attempted.
- On submit with errors, `submitAttempted` flips to `true` and *all* fields reveal their errors plus a form-level summary banner (`role="alert"`) — so the submit button isn't the only signal something's wrong, as required.
- Name uniqueness check is case-insensitive and checked against the in-memory store, since there's no real backend to ask.

## FR5 / FR6 — strings and tokens

- One file, `assets/i18n/en.json`, loaded once via `APP_INITIALIZER` before the app renders. A tiny hand-rolled `TranslateService` + `t` pipe does dotted-key lookup and `{{param}}` interpolation — didn't reach for `@ngx-translate` or `@angular/localize` because the brief only asks for the *habit* of centralising strings, not full i18n tooling, and a real dependency would be harder to defend line-by-line in the live round.
- All colour/spacing/radius/font values are CSS custom properties declared once in `src/styles.css`. Every component stylesheet only references `var(--token-name)` — changing the brand colour is a one-line edit in one file.

## Architecture choices

- **Normalisation happens once, at the service boundary** (`organisation-normalizer.ts`), not scattered through templates. Templates never see `RawOrganisation`, only the strict `Organisation` type — so no component ever needs an `if (typeof x === 'string')` guard.
- **Signals, not RxJS Subjects, for all view state** — `OrganisationStore` exposes readonly signals and one `computed()` for the filtered/sorted view. `MockApiService` still returns Promises internally (deliberately — there's no long-lived stream to model, just page requests), which keeps the signal graph the single source of truth for anything the templates read.
- **URL as the source of truth for search/status/sort** (FR2): read once on init from `ActivatedRoute`, written back with `router.navigate(..., { replaceUrl: true })` so filtering doesn't spam browser history.

## What I'd do differently with two more days

- Add a small unit-test suite around `organisation-normalizer.ts` and the rate limiter — they're the two places bugs would be most expensive and least visible.
- Replace the hand-rolled retry/rate-limit logic with `rxjs`'s `retry` + a proper token-bucket, and reconsider whether signals-only was the right call once real streaming (e.g. live status updates) enters the picture.
- Persist "seen duplicate ids" decisions (e.g. "ignore row X") so ops doesn't see the same duplicate warning every reload.
- Real debounce via `toObservable`/`debounceTime` instead of a hand-rolled `setTimeout`, once RxJS interop with signals is more settled in the version of Angular being targeted.
