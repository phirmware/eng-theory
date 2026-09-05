/**
 * Regression guard: authored answer position must not be observable.
 * Source data is heavily A-biased (it was 59/60 at one point), so the
 * shuffle is the only thing standing between the user and a gameable quiz.
 */
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { shuffle } from '../src/shuffle'


const dir = path.join(process.cwd(), 'src/content/questions')
type Q = { options: { id: string; correct: boolean }[] }
const questions: Q[] = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .flatMap((f) => JSON.parse(readFileSync(path.join(dir, f), 'utf8')) as Q[])

const TRIALS = 500
const counts = { a: 0, b: 0, c: 0, d: 0 }

for (const q of questions) {
  const correct = q.options.find((o) => o.correct)!.id
  for (let i = 0; i < TRIALS; i++) {
    const order = shuffle(q.options.map((o) => o.id))
    counts['abcd'[order.indexOf(correct)] as keyof typeof counts]++
  }
}

const total = questions.length * TRIALS
const expected = total / 4
const shares = Object.entries(counts).map(([slot, n]) => ({
  slot,
  n,
  pct: (n / total) * 100,
  drift: Math.abs(n - expected) / expected,
}))

console.log(`\nCorrect-answer slot over ${total.toLocaleString()} shuffles:\n`)
for (const s of shares) {
  console.log(`  ${s.slot}: ${s.pct.toFixed(2)}%  ${'█'.repeat(Math.round(s.pct))}`)
}

const worst = Math.max(...shares.map((s) => s.drift))
if (worst > 0.05) {
  console.error(`\n✗ slot distribution is skewed (worst drift ${(worst * 100).toFixed(1)}%)`)
  process.exit(1)
}
console.log(`\n✓ uniform within 5% (worst drift ${(worst * 100).toFixed(1)}%)\n`)
