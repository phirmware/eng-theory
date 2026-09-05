# Engineering Theory

Retrieval practice for senior/staff engineering, modelled on the UK driving theory
test — but built around the two things that make it actually work for an open-ended
domain: **explanations that say why the other three are wrong**, and **confidence
capture**, so a confidently-wrong answer is treated as worse than a known gap.

## Run

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm validate   # content schema + quality gate
pnpm build      # runs validate, then typecheck + build
```

## Content

Questions live in `src/content/questions/<section>.json` and are validated by
`src/content/schema.ts` at build time *and* at module load in dev. The schema is
the quality gate, and it deliberately rejects lazy questions:

| Rule | Why |
| --- | --- |
| `why` required on **all four** options (min 40 chars) | Distractors must encode a real misconception, not be filler |
| `explanation` min 90 words | The explanation is the product, not the question |
| exactly one `correct: true` | — |
| `tradeoff` stems must contain concrete constraints | Otherwise the honest answer is "it depends" |
| ids unique, `section` must match filename | — |
| no `(a)`-style references in prose | Options are shuffled per session, so a letter means nothing |

Adding a section: add its id to `SECTION_IDS` in `schema.ts`, add metadata to
`sections.ts`, create `questions/<id>.json`, import it in `content/index.ts`.

## Option shuffling

Authored answer position carries no meaning: options are shuffled per session
(`src/shuffle.ts`, applied in `src/store/session.ts`), and displayed letters are
assigned by render position. The source data is heavily A-biased, so `pnpm
check:shuffle` asserts the correct answer lands uniformly across slots, and the
content validator rejects any prose that refers to an option by letter.

## Study modes

- **Practise by section / drill by topic** — like the driving app
- **Due queue** — FSRS spaced repetition, the daily driver
- **Blind spots** — questions answered wrongly *while certain*

## How scheduling uses confidence

`src/srs.ts` maps the four buckets onto FSRS grades:

| Bucket | Grade | Meaning |
| --- | --- | --- |
| confident + right | Easy | Known, and known to be known |
| unsure + right | Hard | Lucky — not treated as learned |
| unsure + wrong | Again | An honest gap |
| **confident + wrong** | Again, **clamped to ≤24h** | A belief you are acting on at work |

## Progress

Stored in IndexedDB, local to the browser. Export/import JSON from the footer —
do that before clearing site data.

**Progress is per-device.** Practising on your phone and your laptop gives you two
independent schedules. Export from one and import into the other to sync.

## Go deeper

After answering, each question offers a generated prompt for a follow-up with an
AI tool. It carries the stem and code, all four options, the correct answer,
**which option you picked and whether you were confident**, and the explanation
you were just shown — then asks for the underlying mechanism, why your specific
wrong answer was tempting, a concrete example, and what to learn next. It also
asks the model to flag anything in the explanation that is wrong or
oversimplified.

- **Copy prompt** / **Share** send the full version, including the explanation.
- **Open in** links (Claude, ChatGPT, Perplexity, Google AI Mode) carry a compact
  version, because the prompt travels in the query string.

`pnpm validate` fails a question whose compact prompt would exceed the 2048-char
deep-link budget, so new content cannot silently break those links. Google AI
Mode is region- and account-gated; the copy path always works.

## Mobile

Most practice happens on a phone, so the question screen is built for it:

- Answer buttons are full-width and 52px tall, thumb-reachable at the bottom
- Keyboard hints (`U` / `S` / `↵`) are hidden on touch devices
- Safe-area insets keep the action bar clear of the iOS home indicator
- New questions scroll to top; revealing scrolls the graded options into view
- Code blocks scroll horizontally with a fade showing there is more to the right

## Install as an app

It is a PWA and precaches the whole bundle — questions included — so it works
with no connection. On iOS: Share → Add to Home Screen. On Android: the install
prompt, or menu → Install app.

## Deploying to Vercel

```bash
gh repo create engineering-theory --private --source=. --push
```

Then import the repo at [vercel.com/new](https://vercel.com/new). Vercel detects
Vite and pnpm automatically; `vercel.json` supplies the SPA rewrite and cache
headers (immutable for hashed assets, revalidate for the service worker).

Or without a repo:

```bash
pnpm dlx vercel --prod
```

Note that the build command is `pnpm validate && pnpm check:shuffle && tsc -b &&
vite build`, so **a deploy fails if any question violates the content schema or
the answer-position distribution skews.** That is intentional — bad content
should not reach a device you practise on.
