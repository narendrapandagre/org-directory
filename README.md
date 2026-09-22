# Organisation Directory

Take-home assessment submission — Angular 18 standalone app.

## Run it

```bash
npm install
npm start        # ng serve, http://localhost:4200
```

Fixture data lives at `public/assets/data/organisations.json` (140 records,
regenerate with `node scripts/gen-fixture.js`). Translations live at
`public/assets/i18n/en.json`.

## Build

```bash
npm run build     # outputs to dist/org-directory
```

## What's where

- `src/app/services/mock-api.service.ts` — fake backend: 25/page, 400-900ms
  latency, ~15% random failure.
- `src/app/services/rate-limiter.ts` — sliding-window limiter (5 req/min).
- `src/app/services/organisation-normalizer.ts` — pure function that turns
  one messy fixture row into the strict `Organisation` shape the UI uses.
- `src/app/services/organisation.store.ts` — signal-based state: paced
  loading, filtering, sorting, create.
- `src/app/pages/directory/` — the screen itself (list, filters, states,
  create form).
- `DECISIONS.md` — the reasoning behind every non-obvious choice, including
  both required conflict resolutions.

## Requirements coverage

See `DECISIONS.md` for the two conflict resolutions and the AI-tool
declaration required by the brief.
