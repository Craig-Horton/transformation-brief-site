# PRODUCTION-STYLE — how the Brief and its posts get written

This file exists because Craig moved production off Claude Code. Three Claude
Code skills governed how content for this repo got scored, drafted, and
edited — `transformation-brief`, `brief-sharpen`, `what-i-hate` — and none of
them live in this repository. They lived in Claude's per-account skill
configuration, invisible to any other tool. This file inlines their complete,
verbatim rule sets so a different model (or Craig, by hand) can keep producing
the Brief and the LinkedIn posts without that configuration.

Read this alongside `HANDOFF.md`. That file describes the repo; this one
describes the editorial judgment that decides what goes into it.

**A conflict to resolve first, not paper over:** the `transformation-brief`
skill's newsletter-format spec (§3 below) specifies Navy `#1B3A5C`, Burnt
Orange `#C47A2B`, Tahoma, and Title Case headings. The `what-i-hate` skill
(§4 below) explicitly bans those exact values as "the old skill value,
replaced," and the site's live CSS (`index.html` and every `issue-NN-
briefing.html`) uses Navy `#1a2a47`, Amber `#c97a2b`, Amber soft `#e2a358`,
system fonts, and sentence case throughout. **The site and `what-i-hate` are
authoritative. The colour and case values in §3 are stale and should not be
used** — they're kept here verbatim only so the conflict itself is visible,
not because they're the current rule.

---

## 1. Who this is for

Craig Horton: AI transformation advisor, 20+ years enterprise leadership
across Salesforce, Atos, HPE, Microsoft, Accenture. Building Craig Horton
Advisory at the intersection of AI transformation, procurement strategy, and
change management. His frameworks: the AI Business Value Framework (AI BVF),
the Human-Agent Operating Model, the AI Readiness Blueprint. He is the first
resuscitated person to complete six 250km desert ultramarathons, and wrote
*Die Another Day* — that lived experience of pacing, depletion, and system
failure under sustained load is a real analytical lens, not a metaphor to
gesture at.

## 2. Scoring inbound articles (was: `transformation-brief` skill)

Every candidate article/news item is scored 0-2 on five dimensions, 10 max.

| Dimension | 0 | 1 | 2 |
|---|---|---|---|
| **Strategic proximity** | No connection to Craig's domains (consumer tech, gaming, social media) | Adjacent (general enterprise tech, broad AI news) | Direct hit: AI transformation strategy, enterprise tech leadership, healthcare AI, procurement/supply chain tech, change management, AI governance, cloud economics, agentic AI in enterprise, the agentic consulting revolution |
| **Thought leadership angle** | Pure news reporting, no angle available | Craig could comment credibly but the angle is crowded | Craig can apply a specific framework (BVF, Blueprint, EY/Oxford six drivers, From-to, Pace Layer Trap, Organisational Drag Cost) or a unique proof point |
| **Timeliness** | Old news, already discussed, evergreen | Recent (past week), moderate attention | Breaking in 24-48h, tied to a regulatory deadline (EU AI Act, FDA, California AB 2575, MDR) or conference, or an emerging trend not yet widely analysed |
| **Audience resonance** | Too niche/technical, irrelevant to decision-makers | Relevant to a segment (healthcare leaders, procurement, tech execs) | Broadly relevant: CIOs, CTOs, procurement leaders, transformation execs, consulting partners, advisory clients, MBA peers |
| **Shareability** | Needs extensive context to make sense | Summarisable but needs a paragraph of setup | One powerful data point/shift that works in 2-3 lines and makes people want the source |

**Thresholds:** 8-10 strong daily-post candidate, priority newsletter
inclusion. 7 good daily-post candidate, definite newsletter inclusion. 5-6
newsletter only. 3-4 monitor only. 0-2 pass.

**Regulatory lens, one of Craig's most differentiated positions:** flag
explicitly whenever an item touches EU AI Act (classification, conformity,
transparency, high-risk designations), FDA AI/ML clearances, California AB
2575 (disclosure in patient care, clinician override), MDR, GDPR/data
governance, or sector compliance (SOX, HIPAA). Most commentators discuss what
AI can do; Craig discusses what companies must do, and what happens when they
don't govern it.

**Tie-break priority order** when items score equally: (1) AI governance and
regulation, (2) the agentic consulting revolution, (3) healthcare AI and
clinical transformation, (4) agentic AI in enterprise, (5) change management
and transformation failure/success, (6) enterprise tech and cloud economics,
(7) procurement technology and supply chain AI, (8) general AI industry news.

## 3. Producing a daily LinkedIn post

Structure, exactly:

```
[Title or opening line — a position, not a share]

[1-2 lines of context, with a concrete number or fact]

[Source URL, on its own line, clean, no tracking params]

[3-5 hashtags]
```

4-6 lines total, no more. Rules:

- Opening line states a position. "From Potential to Proof," never "Great
  article on healthcare AI" or "I just read..."
- Use the From-to framing when the article describes a shift.
- No em-dashes, commas instead. No emojis unless explicitly requested. No
  tagging people/companies unless asked. Professional, executive tone.
- One insight per post, not multiple points.
- No opening question — that's reserved for the longer-form Reframing
  Question, not short posts.
- Cut generic commentary ("AI is changing everything") and paragraphs that
  summarise the article — the link exists so people read the source, not so
  the post replaces it.

Hashtag pool, pick 3-5 by focus: `#AITransformation #HealthcareAI #AgenticAI
#DigitalHealth #EnterpriseAI #ChangeManagement #AIGovernance
#ProcurementStrategy #CloudEconomics #DigitalTransformation #AIReadiness
#TransformationLeadership #FutureOfWork #AIinHealthcare #DataAndAI`

Worked examples (data-led, From-to, regulatory-hook):

```
From Potential to Proof

With over 1,450 AI tools now FDA-cleared and the healthcare industry
deploying AI at twice the rate of the broader economy, 2026 is the year we
stop asking "can AI work?" and start asking "can you prove it does?"

https://www.radai.com/blogs/its-2026-welcome-to-healthcare-ais-next-act-prove-it-or-move-aside

#HealthcareAI #AITransformation #AgenticAI #DigitalHealth
```

```
From Pilots That Impress to Production That Delivers

McKinsey reports only 4% of enterprises have reached transformative AI
scale. The other 96% are not failing at technology, they are failing at
change management, governance, and trust.

[source URL]

#AITransformation #ChangeManagement #EnterpriseAI #AIGovernance
```

```
The Accountability Layer Is Catching Up

California's AB 2575 would require disclosure of every AI tool used in
patient care. When regulators start asking "which AI touched this patient?",
the organisations without a governance framework will not have a good
answer.

[source URL]

#AIGovernance #HealthcareAI #DigitalHealth #AITransformation
```

## 4. Compiling the weekly Brief

Gather the week's highest-scoring items (4-6), write a 3-4 sentence analysis
per item connecting it to Craig's frameworks, then assemble in this section
order — this is the *intended editorial shape*, not necessarily what every
issue in the archive currently runs (see `HANDOFF.md` §10, item 5, on the
drift):

1. **Header** — masthead, date range, Craig Horton Advisory branding.
2. **This Week's Signal** (the lead item) — title, source, score, then 3-4
   sentences of Craig's strategic take. Reads as editorial, not summary.
3. **On the Radar** — 3-5 further items, ranked, each with a 2-3 sentence
   analysis.
4. **From-to (Weekly Perspective)** — one paragraph (4-6 sentences)
   synthesising the week's themes into a single transition narrative. This
   is the intellectual value-add, not a recap.
5. **The Reframing Question** — Craig's signature closing move. Follow
   Andrew Sobel's Power Questions framework: shift from implementation to
   strategy, from rational to emotional, from "what" to "why." Never use
   fear-based clichés ("what keeps you up at night"). Ask questions that
   surface dreams, legacy, unique value, or strategic purpose — e.g. "What is
   the unique value your team brings that an agent cannot replicate?" The
   best power questions redefine the problem, not just probe it.
6. **What's Next** — 2-3 sentences previewing upcoming regulatory deadlines,
   reports, or trends, to give a reason to return next week.
7. **Footer** — Craig Horton Advisory, LinkedIn URL, contact.

Pre-publish checklist: lead item scores 7+ with a genuine strategic angle,
every source URL works, the From-to section actually synthesises rather than
lists, the reframing question is specific to this week (never generic), no
em-dashes anywhere, headings in sentence case (see the colour/case conflict
note at the top of this file — ignore the Title Case instruction the old
skill doc carried), and the finished piece runs 1-2 pages.

The `transformation-brief` skill kept a running weekly log of scored items
(article, source, score breakdown, draft) to compile from at week's end,
archived every Monday. That log lived in Claude's session storage, not in
this repo — replicate the habit (a running scratch file of the week's
scored candidates) in whatever tool replaces it.

## 5. The pre-publish sharpening pass (was: `brief-sharpen` skill)

Before anything ships — a Brief draft or a long-form LinkedIn post — run it
through this seven-check diagnostic. This is the honest-editor pass, not a
grammar check: **push back substantively, never soften structural feedback
into polish, and never inflate a score to make the draft feel done.**

Score each check 0-4, evidence-backed ("question count: 5 — quote each one,
scored at 0" not "too many questions, scored low"):

1. **Hook does real work.** The opening line must be specific, contested, or
   numeric — named people, exact numbers, contested claims, concrete dates.
   Not a setup line, not "I just read," not "the most interesting thing
   about X."
2. **No AI section labels.** No bolded scaffolding ("The setup", "The body",
   "Patterns", "Perspective"). In a Brief, sub-headers are fine if they're
   real editorial section titles doing navigational work; in a LinkedIn
   post, the argument must move without scaffold labels at all.
3. **Second line holds the first.** After a strong opener, the next line
   must not deflate it. Watch for superlatives bolted onto quotes, clarifier
   sentences that weaken the emphasis, short-sentence "tell" rhythms after a
   flowing opener. Fold into the first line with a comma, or cut it.
4. **One question, not five.** 1 question scores 4. 2 questions (one being
   the signature Reframing Question) scores 3. 3 → 2. 4 → 1. 5+ → 0. The
   Reframing Question is the signature move; everything else devalues it.
5. **Craig is actually in it.** At least one sentence only Craig could have
   written — his ultrarunning-derived intuition for pacing, depletion, and
   system failure doing real analytical work, not referenced as a metaphor.
   No Craig-specific reasoning anywhere caps the score at 1-2 regardless of
   how polished the rest is.
6. **Position, not performance.** Does the piece assert where Craig stands,
   or stage-manage the reader through "thoughtfulness theatre"? Watch for
   excessive hedging, rhetorical questions standing in for assertions, "it
   is worth considering" framing, consultant-speak performing rigour instead
   of landing a view.
7. **Fifteen percent shorter than draft one.** A second pass should run
   roughly 15% shorter than the first, cuts coming from scaffolding and
   filler, not substance. Telltale filler: "Very interesting that...", "It
   is worth noting that...", parenthetical definitions of words the audience
   already knows, paragraphs that announce what the next paragraph will do.

**Bands, out of 28:** 22-28 ready to publish (say so plainly, flag the one
strongest sentence, don't invent concerns to look rigorous). 18-21 one more
pass (name the single weakest check with specific failing sentences, rewrite
only that section). 12-17 structural rewrite (diagnose the top three failing
checks with line-level evidence, rewrite the weakest section in full as a
demonstration, offer the full rewrite). Below 12: do not publish — say so
directly, ask what the argument was supposed to be, start again from the
argument, not the draft.

**How to run it:** read the whole draft first, never score paragraph by
paragraph. Present scores as a compact table (Check / Score / Read, one
evidence sentence per row), then a prose autopsy in reading order — not
bullets — naming specific sentences as block quotes, separating what works
from what's flattening the piece. For any score ≤18, always rewrite at least
one section in full as a worked demonstration — a diagnostic without a
worked example is just critique. If the rewrite sharpens craft but can't
close the Craig-is-actually-in-it gap (because that needs content only Craig
has), say so directly rather than pretending craft substitutes for voice.
Close with one clear recommendation, never "let me know if you want me to
...".

**Voice non-negotiables**, flagged explicitly on breach regardless of the
numeric score: flowing prose joined by commas, never staccato short
sentences stacked with full stops; sentence-case headings only; no
em-dashes, ever; no section titled "The Uncomfortable Truth" or variants;
no AI-sounding bullet-point prose in thought leadership; no fabricated
examples — experience-based and factual only.

**The five recurring failure patterns to check every time**, in order of how
often Craig's own drafts fall into them under time pressure:

1. The rhetorical-question habit — good once, eroded by three, devalued by
   five.
2. The second-line deflation — strong opener, then a clarifier that sucks
   the air out. Check the hook-to-second-paragraph transition specifically.
3. The scaffold-label tic — bolded "The setup"/"Patterns"/"Perspective" in
   LinkedIn posts. Flag every instance.
4. The parenthetical gloss — defining words the audience already knows
   (reads as uncertainty about who's reading).
5. The staccato slip — colon-delimited triads, "one is about X, one is about
   Y, one is about Z" rhythms that breach the flowing-prose rule.

## 6. The banned list (was: `what-i-hate` skill) — read this before writing

Applies to everything written for this project: Brief issues, LinkedIn
posts, site copy, commit messages that touch prose, any artefact.

**Banned openers:** "In today's fast-paced world..." and any variant that
scene-sets the macro environment before saying something.

**Banned words**, strike on sight, no exceptions: crucial, delve, embark,
enduring, enhance, evolving, foster, garner, interplay, intricate, "it
seems", "I think", landscape, leverage, "maybe" (when softening a claim),
nuanced, perhaps, pivotal, showcase, synergy, tapestry, testament,
underscore, unleash, utilize, vibrant.

**Conditional words**, three exceptions, allowed only under discipline:
*Robust* — allowed for controls, governance, testing, architecture, risk
frameworks; banned as a generic adjective ("robust governance" passes, "a
robust approach" fails). *Navigate* — allowed with a concrete object
("navigate the EU AI Act" passes, "navigate the complexities of" always
fails). *Therefore* — allowed once per piece, never twice; a second logical
pivot restructures into "which means," "the implication is," or pure
juxtaposition.

**Banned phrases**, the packaged AI clichés that appear at 100-107x the
human rate: "it is important to note that...", "a testament to...",
"provide valuable insights", "left an indelible mark", "a rich tapestry
of...", "navigate the complexities of...", and close variants.

**Banned transitions:** moreover, furthermore, additionally, consequently,
subsequently, ultimately, "in conclusion", "to sum up". Use a comma, a fresh
sentence, or restructure so the connection is implicit.

**Banned punctuation:** em-dashes, anywhere, ever — commas, sentence breaks,
or restructuring instead. Fragment full stops (the "Pilots that work.
Production that stalls." punch pattern) — use flowing prose instead. ALL
CAPS anywhere, including CSS and typeset caps. Italics anywhere — headings,
subheadings, body, pull quotes, attributions — use weight or colour for
emphasis instead.

**Banned patterns:** the "X is not A, it is B" contrast flip. The "Not A.
Not B. But C." three-beat negation. The "Despite this..." pivot that sets up
tension just to resolve it neatly. Importance sentences that gesture at
impact/legacy/significance without saying anything load-bearing — cut them.
Vague authority ("experts say," "industry reports show," "many believe") —
name the source or drop the claim. The generic test: if a sentence could
apply to a thousand other topics, delete it. Unproven general claims ("
improves results" without specifying how — cut). Title Case headings —
sentence case throughout, body and headings. Hedging used to soften a truth.
Behaviour claims dressed up as gap claims without a citation or structural
rewrite. IT thinking that treats AI as a tool to install rather than a
platform for organisational redesign. LinkedIn CTAs aimed at developers —
the audience is senior leaders making decisions, not technical operators.

**Banned structure:** paragraphs longer than three sentences. "Firstly,
secondly, finally" lists. Closing summaries that restate what was just said
("in conclusion," "overall," any bow-tying wrap-up). Staccato prose with
excessive full stops and random capitalisation. The eager-to-please,
overly-structured template feel.

**Banned voice:** motivational/TED-Talk tone, no preaching. Stage-speech
register — write as if sending the line to one person, not addressing a
room. Detached-observer voice — the writer has skin in the game and the
prose carries that weight.

**Brand colours, locked** (this is the authoritative version — matches the
live site CSS in `HANDOFF.md` §4, and supersedes §3 of this file above):

- Navy `#1a2a47` — primary background on covers/section headers, primary
  body text on white.
- Amber `#c97a2b` — primary accent for kickers, rules, hairlines, callouts.
- Amber soft `#e2a358` — secondary accent for navy backgrounds.
- White `#ffffff` — primary body page background.

Body copy is navy on white or white on navy, never grey. Structural lines
may use subtle navy alpha. **Banned values, struck on sight:** Navy
`#1B3A5C` (old skill value), Burnt orange `#C47A2B` (old skill value), Cream
`#fafaf7` (removed from the system — also banned as a *word*, in prose,
captions, design notes, CSS variable names, class names; never "cream
surface," "cream tone," "warm cream" — the system is navy, amber, white).

Note that `index.html`'s live CSS still defines a `--cream: #fafaf7` custom
property used as the page background — that predates this rule and is a
live conflict with it, not a sanctioned exception. Anyone touching that CSS
should know the locked palette says white, not cream, even though the
current site doesn't yet reflect it.

**Aesthetic crimes in artefacts** (PDFs, slides, web pages, branded output):
no `text-transform: uppercase` anywhere, no typeset caps for kickers/labels/
tags — sentence case carries the kicker style via letter-spacing instead. No
`font-style: italic` anywhere. No grey body text. Headings and body both
sentence case, never ALL CAPS, never Title Case.

**Editing-output protocol**, when the task is to sharpen/edit/clean an
existing draft: return the rewritten text and nothing else. No preamble
explaining changes, no diff annotations, no "before and after," no
commentary, no bold sprinkled on to mark insights. The edit speaks for
itself or it has failed. (This governs sharpening passes specifically —
long-form artefacts that legitimately use weight for structure, BVF
documents, Briefs, decks, follow the brand rules above instead.)

**The cringe test**, applied before anything ships: read it back and ask one
question — if a sentence makes you think "you can see that was written by
AI," it has failed. Rewrite or cut. The voice is a senior practitioner
holding up the mirror, not a template eager to please.

## 7. What's deliberately out of scope here

Two other Claude Code skills touch Craig's broader advisory practice but
aren't specific to this repo, so they aren't inlined: `bvf-advisor` (scores
AI transformation portfolios against the full AI BVF engine — the framework
itself lives in the separate `bvf-app` project) and `craig-ai-copilot`
(career coaching, MBA prep, broader AI-news triage). If a future session
needs those too, the same extraction approach applies: load the skill, read
its `references/` files in full, inline verbatim.
