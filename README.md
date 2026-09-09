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

Until this is done the site serves the snapshot and labels itself "Saved copy".
One command, then approve the Google screen it opens:

```bash
pip install -r requirements-sync.txt
python3 scripts/setup_vercel_env.py
npx vercel deploy --prod
```

It mints a refresh token and writes all four variables into Vercel over stdin.
Nothing sensitive is printed, so the token stays out of your clipboard and shell
history. Needs `client_secret.json` in the repo root and a logged-in Vercel CLI.

Confirm it worked:

```bash
curl -s https://nustview.vercel.app/api/timetable | head -c 120   # "source":"live"
```

The variables, if you ever set them by hand: `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_SHEET_ID`.

> The consent flow requests `spreadsheets.readonly` only. The previous sync used
> a Drive export, which required `drive.readonly`: a token that could read every
> file in the account. Re-running this narrows what a leak would expose.

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
