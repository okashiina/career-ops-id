# Remote boards routing

Durable map for the `remote hunt` track. Source behaviour changes; re-verify
during each hunt and do not treat this file as proof that a feed is current.

## Boards in scope

| Board | Read path | Provider id | Live check (2026-09-12) |
| --- | --- | --- | --- |
| Working Nomads | `https://www.workingnomads.com/api/exposed_jobs/` (JSON array) | `workingnomads` | 200, 43 postings |
| We Work Remotely | `https://weworkremotely.com/remote-jobs.rss` (RSS) | `weworkremotely` | 200, 89 items, `<region>` on every item |
| Jobspresso | `https://jobspresso.co/?feed=job_feed` (WordPress RSS) | `jobspresso` | 200, 10 items |
| Remote.co | `https://remote.co/remote-jobs` public pages; candidate feeds `https://remote.co/remote-jobs/feed/`, `https://remote.co/feed/?post_type=job_listing` | none (web/browser only) | Akamai bot wall; connection timed out from two networks |

The three provider-backed boards are wired in the user's `portals.yml` as
`job_boards:` entries whose `name` starts with `Remote Board:` so that
`node scan.mjs --company "remote board"` scopes a run to them (the flag is a
case-insensitive substring match on `name`). Do not add a Remote.co provider
under `providers/`; that directory is system layer and is overwritten on
update. If Remote.co becomes reachable and exposes a stable feed, propose it
upstream or add a user-layer fallback script next to `glints-scan.mjs`.

## Coverage limits — read this before promising a wide search

The default feeds are small samples, not the boards' full inventory. Measured
2026-09-12:

- **We Work Remotely.** `remote-jobs.rss` carries 89 items. Category feeds at
  `https://weworkremotely.com/categories/<slug>.rss` carry more and are the
  better source: `remote-full-stack-programming-jobs` returned 118 items,
  `remote-programming-jobs` 25, `remote-devops-sysadmin-jobs` 18,
  `remote-product-jobs` 17, `remote-design-jobs` 13,
  `remote-back-end-programming-jobs` 6, `remote-front-end-programming-jobs` 3.
  `remote-all-other-remote-jobs`, `remote-marketing-jobs` and
  `remote-sales-jobs` answered 403. The upstream `weworkremotely` provider
  hardcodes the main feed only, so category feeds must be pulled separately
  (curl) or through the browser. **Every WWR HTML page — search, category, and
  some job pages — sits behind Cloudflare**, so `weworkremotely.com/remote-jobs/search?term=…`
  needs the browser, not a fetch.
- **Working Nomads.** `/api/exposed_jobs/` returns a fixed ~44-item sample.
  `?category=`, `?tag=`, `?search=` and `?limit=` are all silently ignored —
  every variant returns the same 44 rows. **This board is the best of the four
  for internship and part-time work, but only through its landing pages**,
  which are Angular and must be opened in the browser (a fetch returns just
  the header; job pages return 403 to fetch too). Working URL pattern,
  confirmed 200 on 2026-09-12:
  - `/remote-internship-jobs`
  - `/remote-part-time-development-jobs`
  - `/remote-entry-level-artificial-intelligence-jobs`
  - `/remote-entry-level-software-engineer-jobs`
  - `/jobs` with its own Category / Experience level / Job type filters
    (Entry-level, Part-time, Freelance-Contract are real filters here)

  Each listing page shows an explicit `Entry Level` / `Mid Level` badge and a
  `Full-time` / `Part-time` / `Contract` badge — read those instead of
  guessing from the title. A single browser pass over these pages surfaced
  genuine intern and part-time engineering roles that appear in **none** of
  the three RSS/JSON feeds, so never conclude "no internships exist" from the
  feeds alone.
- **Jobspresso.** The live feed (`?feed=job_feed`) carries about 10 items. Its
  WordPress search endpoint (`/wp-admin/admin-ajax.php?action=job_manager_get_listings`,
  with `filter_job_type[]` taking the *role* slugs `developer`, `product-mgmt`,
  `ai-data`, `various`, `designer`, …) exposes ~1,690 rows, but that is an
  **archive**: it is full of expired postings from 2020–2025 (PagerDuty Fall
  2020, Cloudflare 2020, Figma 2021). Employment type is the
  `job_listing_category-<type>` CSS class (`full-time`, `part-time`,
  `internship`, `contract`, `freelance`), not `filter_job_type`. Of 1,690
  archived rows only 28 are internships and 28 part-time, and the live
  internship count via the board's own search is **zero**. Never present an
  archive row as a current opening without opening the posting.
- **Remote.co.** Unreachable: Akamai wall, connection timeout on both curl and
  fetch. Search-engine results are the only visibility.

**Consequence for a hunt:** these four boards are structurally mid-to-senior
and full-time. If the user asks for internships or part-time engineering
roles, say up front that the expected yield is low, and do not pad the list
with senior or data-labeling roles to hit a count.

## What the scanner does with each feed

- **Title filter.** `portals.yml` → `title_filter` applies unchanged. Remote
  boards are dominated by senior marketing, sales, and support roles; the
  positive/negative keyword lists will drop most items. A run that returns a
  handful of matches from 140+ feed items is normal.
- **Location filter.** `location_filter.allow` must match. Observed values:
  - We Work Remotely `<region>`: `Anywhere in the World` (passes via
    `anywhere`), `North America Only` (blocked). Nothing else was observed.
  - Working Nomads `location`: free text such as `Global`,
    `Remote (Worldwide) - Working East Coast Hours`, `Europe, LATAM, APAC, the
    U.S., Canada` (pass via `global` / `worldwide` / `apac`);
    `USA, Canada or UK only`, `Latin America, Europe, Canada, UK, South
    Africa`, `Philippines`, `CET (+/- 3 hours)` (blocked). A blocked Asian
    country name (`Philippines`, `Japan - Remote`) is a filter gap, not an
    eligibility ruling; review manually when the user widens to Asia.
  - Jobspresso `job_listing:location`: often empty, which passes; treat as
    unknown and read the posting.
- **Freshness.** `--since N` only prunes items whose provider supplies a
  `postedAt`. We Work Remotely and Jobspresso do (RSS `pubDate`). Working
  Nomads does not (the provider drops `pub_date`), so every Working Nomads
  match survives `--since`; check the date on the posting page.
- **Dedup.** The scanner dedups on URL and against `data/scan-history.tsv`.
  Working Nomads URLs are `/job/go/<id>/` redirectors to the employer page;
  the same employer posting can appear again through a company ATS entry with
  a different URL. Collapse those by normalized company + role before ranking.

## Eligibility rules for an Indonesia-based candidate

**The We Work Remotely region label is not trustworthy on its own.** Observed
2026-09-12: Zenara Health is tagged `Anywhere in the World` but the posting
says "fully remote throughout India", quotes ₹22–35 LPA and requires IST
evening hours; Base.com is tagged `Anywhere in the World` but the entire
posting is in Polish. Always read the body before believing the tag.

Remote is a lead signal, not an eligibility ruling. Before Apply:

1. Read the full posting for `US only`, `must be authorized to work in`,
   `W-2`, `must reside in`, named timezones, and EOR/contractor language.
2. Classify: **open worldwide / any-country contractor** (strongest),
   **APAC or Asia listed** (strong), **timezone-bounded but Indonesia fits**
   (WIB is UTC+7; CET ± 3 h does not fit, US East Coast hours means a night
   shift and must be flagged), **region-locked elsewhere** (reject).
3. Prefer roles that state pay or a range. Working Nomads descriptions often
   carry a monthly USD figure; copy it only when the posting states it.
4. Internship/entry evidence: remote boards rarely post internships. If the
   user asked for internship only, expect few or zero credible remote leads
   and say so rather than padding with mid-level roles.
5. Record the displayed region, the eligibility class above, pay if stated,
   posted date if available, and one fit reason. Unknown stays unknown.

## Employer leads worth re-checking each hunt

Sources that repeatedly carry remote, paid, part-time/contract AI-automation
work open to any country. Verify liveness every time; do not present a
remembered posting as current.

- **Bamboo Works** (`bambooworks.applytojob.com`) — a remote-staffing firm
  (recruitment run out of Manila) that hires globally as independent
  contractors with flexible hours. Its board consistently carries `AI &
  Automation Intern`, `AI & Automation Specialist`, `AI Agent & Automation
  Specialist`, and `QA Engineer (Voice Agents)`, all tagged simply `Remote`
  with no country lock in the posting body, and some quote pay (an AI Agent
  Specialist listing showed $1,000–1,600/month). Reached via Working Nomads.
  Caution: third-party scraper mirrors of these postings add a boilerplate
  "open to candidates in USA" line that the official posting does not contain
  — trust the employer's own page.
- **Allium** — posts an `Engineering Intern - General / AI` and states "we
  hire from any geographical location as long as you are willing to overlap 2
  hours on NYC mornings Mon-Thurs 10am-12pm ET" (that is 21:00–23:00 WIB, so
  Indonesia fits). But Allium is blockchain data infrastructure, so it hits
  the crypto/Web3 exclusion in `data/blacklist.md` — flag it for the user's
  decision rather than recommending it silently.
- **Storyteller** — `Junior Web Developer`, explicitly requires "genuine
  excitement for AI and AI-assisted coding", TypeScript/Node/Python. Posted
  as separate country-locked variants (Bulgaria, Romania, Hungary, Turkey,
  South Africa, Egypt, Tunisia) with salaries stated per country. **No
  Indonesia variant exists**, so it is a reject today; worth re-checking
  because the company clearly clones the role per market.

## Search vocabulary (web/browser fallback and Remote.co)

Rotate these with `site:` operators when the scanner is thin or for Remote.co:

- `site:remote.co/remote-jobs ("AI Engineer" OR "LLM" OR "AI Automation" OR "Machine Learning") (intern OR junior OR "entry level")`
- `site:weworkremotely.com ("AI" OR "LLM" OR "Machine Learning" OR "Automation") (junior OR intern OR "entry level")`
- `site:workingnomads.com ("AI Engineer" OR "AI Automation" OR "LLM") (junior OR intern)`
- `site:jobspresso.co ("AI" OR "Machine Learning" OR "Automation") (junior OR intern)`
- Add `("anywhere in the world" OR worldwide OR APAC OR Asia)` when the first
  pass is US-heavy.

Use normal public browsing only. Never bypass Akamai/Cloudflare challenges,
robots restrictions, or logins; if Remote.co is unreachable, say so and move
on to the other three boards.

## User-specific policy

Candidate facts come only from the active checkout's user layer: `cv.md`,
`config/profile.yml`, `modes/_profile.md`, `modes/_brief.md`,
`modes/_custom.md`, `data/blacklist.md`, and the tracker. Salary floors,
level, and sector exclusions are user policy, not remote-board rules. Never
embed a local machine path or personal contact details in this file.
