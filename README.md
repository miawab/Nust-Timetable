# NUST-view

Timetable viewer for SEECS, built from the university's private Google Sheet.

- **Timetable Viewer** — per-section day and weekly grids, with course code, room and instructor
- **Now / Next** — what's on right now and what's next, for the section you last picked
- **Free Room Finder** — rooms with no class booked, by day and time slot
- **Teacher Schedule** — any teacher's full week
- **Course Search** — find a course or code across every batch

## How data gets in

The site reads the sheet **live** through the Google Sheets API and caches the
result for 5 minutes. An edit in the sheet reaches students within ~5 minutes
with no redeploy and no commit.

```
Google Sheet ──Sheets API──> lib/timetable/parse.ts ──> page (revalidate 300s)
                                    │
                                    └── falls back to lib/timetable/snapshot.json
```

`lib/timetable/snapshot.json` is the safety net, served whenever the live read
fails. `.github/workflows/refresh-snapshot.yml` refreshes it weekly.

### Turning on live sync

Until these four variables are set, the site serves the snapshot and shows a
"showing the last saved copy" notice. Set them once:

```bash
vercel env add GOOGLE_CLIENT_ID production
vercel env add GOOGLE_CLIENT_SECRET production
vercel env add GOOGLE_REFRESH_TOKEN production
vercel env add GOOGLE_SHEET_ID production
```

The same four values already exist as GitHub Actions secrets on this repo. If
you no longer have the refresh token, mint a new one:

```bash
pip install -r requirements-sync.txt
python3 scripts/google_oauth_get_refresh_token.py   # needs client_secret.json
```

`GOOGLE_SHEET_ID` is the id in the sheet URL, between `/d/` and `/edit`.

> The OAuth flow now requests `spreadsheets.readonly` only. The previous sync
> used a Drive export, which required `drive.readonly` — a token that could read
> every file in the account. A token minted before this change still works, but
> re-minting narrows what a leak would expose.

## Working on the parser

The sheet is maintained by the university and its layout changes without
warning, so the parser reads by header text rather than by fixed positions, and
refuses to publish output it does not recognise.

```bash
npm run check:parser   # parse the committed fixture and report data quality
npm run snapshot       # rebuild snapshot.json (live sheet if credentials are set)
npm run fixture        # rebuild the test fixture from a downloaded timetable.xlsx
```

`npm run check:parser` should report **0 pipe leaks** and **0 room-as-course**.
Both are regressions that previously reached students: raw spreadsheet
metadata (`Makeups | 2K22-BEE-14A | EE381-... | Thursday 14 May @ 1400-1450`)
displayed as a course name, and room labels displayed as courses.

### What breaks loudly, on purpose

- No readable grid at all → `TimetableShapeError`, the build fails
- A live read parsing to under 40% of the snapshot → snapshot served instead
- `npm run snapshot` refuses to overwrite with a result under 60% of the current one
- Unreadable batch headings, missing weekday columns and missing tabs are
  collected in `meta.warnings` and returned by `/api/timetable`

### Things that used to silently drop data

Worth knowing about, since the sheet keeps changing:

- Day columns were read at fixed indices, so a hidden or added column shifted
  every class by a day
- The batch regex was case-sensitive, so headings written `2k25-BEE-17A` instead
  of `2K25-` dropped six freshman sections
- Study year came from a hardcoded `2K22`–`2K25` table; a `2K26` intake would
  have vanished. It is now derived from the semester number in the heading.

## Local development

```bash
npm install
npm run dev
```

With no credentials configured, local runs serve the snapshot — enough for all
UI work. `/api/timetable` returns the parsed data plus `source`, `fetchedAt` and
any warnings; add `?refresh=1` to bypass the cache.
