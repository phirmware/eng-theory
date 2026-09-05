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
