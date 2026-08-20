# HANDOFF — transformation-brief-site

A portable, self-contained brief on this repository. It exists so that a new
model, agent, or human can pick the project up cold, without reading every file
and without access to the chat history that produced it.

**How to use it:** paste this file (or attach it) at the start of a new session
and say what you want done. Everything below is fact taken from the working tree
at the time of writing, not recollection. When the repo changes materially,
update this file in the same commit.

---

## 1. What this is

The public web presence of **Craig Horton Advisory** — Craig Horton, an
Amsterdam-based AI transformation advisor. It is a hand-written static site with
two Vercel serverless functions behind it. No build step, no framework, no
package.json, no node_modules. HTML, inline CSS, a little vanilla JS.

The site does four jobs:

1. Publishes **The Transformation Brief**, a weekly Friday newsletter (issue
   briefing pages + PDFs + an archive).
2. Hosts **interactive tools** — the Human-Agent Operating Model diagnostic and
   the Workflow Coroner explainer.
3. Runs **capture** — an email subscribe form and a one-question "pulse" poll,
   both writing to Supabase.
4. Carries the **positioning** — about, contact, and a long-form paper.

Repo: `https://github.com/Craig-Horton/transformation-brief-site`
Default branch: `main`. Hosting: Vercel, auto-deploy on push to `main`.

## 2. Live surfaces

| URL | Serves |
|---|---|
| `craighortonadvisory.com` | `/index.html` — home |
| `brief.craighortonadvisory.com` | same deployment, used as the Brief's canonical host in newsletter footers |
| `pulse.craighortonadvisory.com` | rewritten by `vercel.json` to `/pulse/` |
| `bvf.craighortonadvisory.com/?code=bvf2026` | **separate project** (`bvf-app`), linked from here, not in this repo |
| `github.com/Bahamas1717/ai-bvf` | open-source `aibvf-mcp` server, linked from here, not in this repo |

DNS is at **TransIP**; the `pulse` subdomain is a CNAME to
`cname.vercel-dns.com.` (see `DEPLOY_PULSE.md` Step 3a).

## 3. Repo map

```
index.html                  Home. Hero, subscribe form, six destination cards, bio, footer.
about.html                  Craig's story, ultra-running photos from images/.
contact.html                Calendly popup CTA.
archive.html                Every issue of the Brief, newest first. The index of record.
diagnostic.html             Interactive 8-dimension maturity diagnostic (all logic inline).
workflow-coroner.html       Explainer + in-page "agentic workmate" demo for the Coroner pipeline.
end-of-the-org-chart.html   Long-form paper, April 2026.

issue-NN-briefing.html      Web version of issues 13-18. Self-contained, email-shaped, print-to-A4.
issue-NN.pdf                Downloadable PDF of issues 04-18. (Issue 18 is issue18.pdf — see §10.)
craig-transformation-questions-booklet.pdf

pulse/index.html            One-question poll page. POLL config block near the bottom.
pulse-thanks/index.html     Post-submit confirmation. noindex + nofollow.

api/subscribe.js            POST → public.brief_subscribers (Vercel function).
api/pulse-submit.js         POST → public.blueprint_index_responses (Vercel function).
migrations/001_*.sql        blueprint_index_responses table, RLS, monthly rollup view.
migrations/002_*.sql        brief_subscribers table, RLS, active-subscriber view.

linkedin/                   Paste-ready markdown for the LinkedIn newsletter edition + the
                            recurring pulse CTA block with its 6-month driver rotation.
images/                     Issue covers, inside visuals, personal photos.
share-cbb65973c46c/         CV, cover letter, portfolio PDFs. Unlisted, disallowed in robots.txt.
DEPLOY_PULSE.md             Full runbook for the pulse: migration, env vars, DNS, smoke test.
vercel.json                 One host-based rewrite (pulse subdomain → /pulse/).
robots.txt                  Disallows /epam/ and /share-cbb65973c46c/.
```

## 4. Two design systems, do not mix them

**A. Site pages** (`index`, `about`, `contact`, `archive`, `diagnostic`,
`workflow-coroner`, `end-of-the-org-chart`, `pulse`) — Google Fonts, CSS custom
properties, responsive grids:

```css
--navy:#1a2a47  --navy-deep:#121f36  --amber:#c97a2b
--amber-soft:#e2a358  --cream:#fafaf7  --hairline:rgba(26,42,71,.18)
```

Headings **Cormorant Garamond** (600/700, tight negative letter-spacing), body
**Inter**. Sizes are in `pt`, not `rem`. Amber accent strip (4px) above the navy
nav. Section kickers are 10pt Inter 700 with `letter-spacing:.32em`. Cards are
white with a 3px amber top border. Every page carries the same nav and footer —
**if you add a nav link, add it to all of them.**

**B. Briefing pages** (`issue-NN-briefing.html`) — deliberately different. They
must survive an email client and a print-to-PDF, so: `Arial`/`Georgia` system
fonts only, no external font requests, a single `.mail` wrapper at
`max-width:760px`, everything inlined in one compressed `<style>` block, plus an
`@media print { @page { size:A4; margin:0 } }` rule that produces the PDF. Copy
the previous issue's file and edit it; do not port site CSS into it.

## 5. The weekly Brief production loop

Structure of an issue (see `issue-18-briefing.html` as the current reference):
masthead → greeting (2 short paragraphs, "Good morning, …") → **The lead
signal** (h2, 4-6 paragraphs, usually one bulleted list and one inside visual
with a caption) → **On the radar** (numbered stories, 2 paragraphs each, each
opening with a source link) → **The question I would take into the room** (navy
box) → footer with the sign-off and the personal-capacity disclosure.

Publishing an issue touches, in order:

1. `issue-NN-briefing.html` — copy the previous issue, replace content, update
   `<title>`, the dateline, and the visual `src`.
2. `images/visual-NN-*.png` — the inside visual, and `issue-NN-cover.png` if the
   LinkedIn edition needs a cover.
3. `issue-NN.pdf` — print the briefing page to A4.
4. `archive.html` — add a new `<div class="edition">` block at the **top** of
   `<section class="editions">`: date, `<h2>` title, `<div class="summary">`
   (one or two sentences, `<br><br>` between them), then a `.links` row —
   `Read on LinkedIn` (added later, once published), `Read the briefing`,
   `Download PDF`.
5. `linkedin/issue-NN-linkedin.md` — the paste-ready LinkedIn edition, mirroring
   the briefing section for section.
6. `pulse/index.html` — rotate the question monthly: the `.meta` line, the
   `#question` h1, the four `.option` labels, and the `POLL` config object
   (`driver`, `question_id`, `issue_number`). Driver rotation and the exact
   questions live in `linkedin/newsletter-cta.md`.

Commit, push to `main`, Vercel deploys in 60-90s. Note the two "trigger
production rebuild" commits in the log — Vercel has occasionally missed a merge
deploy, and an empty-ish commit is the accepted fix.

## 6. Backend

Both functions are the same shape: CORS allowlist from `ALLOWED_ORIGINS`, OPTIONS
→ 204, non-POST → 405, shape validation, an in-memory soft rate limit that resets
on cold start, then a `fetch` straight to the Supabase REST API with the service
role key. No Supabase client library, no dependencies at all.

| | `/api/subscribe` | `/api/pulse-submit` |
|---|---|---|
| Table | `public.brief_subscribers` | `public.blueprint_index_responses` |
| Rate limit | 60s per IP+email | 5min per anon_token+question_id |
| Validation | email regex, ≤254 chars | driver allowlist (6 Blueprint drivers), length caps |
| Duplicates | `resolution=ignore-duplicates`, 409 treated as success | not deduped server-side |

Env vars (Vercel project settings, production): `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_ORIGINS` (comma-separated). The service
role key bypasses RLS — it must never appear in a commit, in client JS, or in a
log. RLS is enabled on both tables and anon has no policy, so **every** write
goes through these functions.

Front-end wiring: `index.html` and `archive.html` each carry a small IIFE that
posts the form to `/api/subscribe` and writes status text into a
`.subscribe-status` element. Forms are identified by `data-source`
(`home-hero`, `archive`) which is stored as the `source` column.

Deliberate omissions, documented in `DEPLOY_PULSE.md` and worth preserving: no
analytics or tracking beacon anywhere, no email capture on the pulse, no captcha,
no admin UI. The privacy claim in the pulse copy depends on the first one.

## 7. The interactive tools

**`diagnostic.html`** — eight dimensions (`workflow, decisions, teams,
governance, data, talent, culture, measurement`), each scored 1-4. The average
maps to five maturity stages: Legacy Hierarchy (≤1.3), Early Augmentation (≤2.0),
Hybrid Transition (≤2.7), Orchestrated Operations (≤3.4), Agentic Enterprise.
It then renders bars, pulls recommendations for the four lowest dimensions from a
`recs` lookup keyed by dimension and score, adds a reframing question for the
lowest, and computes an organisational drag percentage as
`round((1 - (avg-1)/3) * 45 + 10)`. All state is in-page; nothing is submitted.

**`workflow-coroner.html`** — marketing/explainer page for a five-agent pipeline
(Pulse → Verdict → Architect → Wire → Sequencer, under a Coroner orchestrator)
that lives in a **different** repo. The page includes an in-browser "agentic
workmate" that reproduces the Verdict scoring client-side from a few inputs.

## 8. Voice and house style

Craig's own voice, and the site is written in it throughout. Observable rules:

- British spelling (organisation, prioritise, licence).
- Long sentences joined by commas rather than semicolons or em dashes.
- First person, measured, no hype. "I would want…", "I found this interesting
  because…". Claims are attributed and linked to a primary source.
- Numbers stay specific (EUR 300M, 17%, 2,897 downloads) — never rounded into
  vagueness.
- Every briefing ends with the personal-capacity disclosure naming the current
  employer. Keep it, and keep it current.
- Commits are short sentence-case imperatives: "Publish Issue 18 archive entry",
  "Add Issue 17 cover image".

A repo-adjacent Claude skill set (`transformation-brief`, `brief-sharpen`,
`what-i-hate`) encodes this in more detail; those live in Craig's Claude
configuration, not in this repo, so a model without them should lean on the
published issues as the style reference.

## 9. Working on this repo

- There is nothing to install and nothing to build. Open the HTML file.
- To preview locally: `python3 -m http.server 8000` from the repo root. The
  `/api/*` functions will not run under that server — test them on a Vercel
  preview deployment.
- Edit HTML directly. Do not introduce a framework, a bundler, or a CSS file
  without a reason that survives §4 — the self-contained pages are the point.
- Large binaries (PDFs, images) are committed to git. The working tree is ~19MB.

## 10. Known open items

None of these are broken, but a new owner should know about them:

1. **Issue 18's PDF is `issue18.pdf`**, breaking the `issue-NN.pdf` convention
   used by 04-17. `archive.html` links it correctly, so renaming it means
   updating that link too.
2. **The pulse is stale.** `pulse/index.html` still shows Issue 17 / the Strategic
   Alignment driver, while Issue 18 has published. §5 step 6 is the fix.
3. **Two GitHub orgs for the same project.** `index.html` links
   `github.com/Bahamas1717/ai-bvf`; `workflow-coroner.html` links
   `github.com/Craig-Horton/ai-bvf`. One of them is wrong.
4. **Issues 04-12 have no briefing page**, only a PDF. The archive links reflect
   that; do not assume `issue-NN-briefing.html` exists for every NN.
5. **The Brief's advertised shape drifts.** `index.html` promises "five Radar
   picks and one counter-voice"; recent issues run three radar stories and no
   counter-voice. Align the copy or the format.
6. **`robots.txt` disallows `/epam/`**, a directory that no longer exists.

## 11. A prompt to start a new session with

> I'm continuing work on `transformation-brief-site`, a hand-written static site
> (no build step) on Vercel with two Supabase-backed serverless functions. The
> attached HANDOFF.md is the full context: repo map, the two design systems, the
> weekly newsletter production loop, the backend contract, house style, and the
> known open items. Read it first, then [your task].

If the model can run commands, add: *check HANDOFF.md against the working tree
before trusting it, and update it if it has drifted.*
