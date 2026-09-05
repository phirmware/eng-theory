import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { QuestionSchema, type Question } from '../src/content/schema'

const dir = path.join(process.cwd(), 'src/content/questions')
const problems: string[] = []
const seen = new Map<string, string>()
const all: Question[] = []

for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const parsed = JSON.parse(readFileSync(path.join(dir, file), 'utf8')) as unknown[]
  parsed.forEach((entry, i) => {
    const result = QuestionSchema.safeParse(entry)
    if (!result.success) {
      const id = (entry as { id?: string }).id ?? `${file}[${i}]`
      for (const issue of result.error.issues) {
        problems.push(`${id}: ${issue.path.join('.') || '(root)'} — ${issue.message}`)
      }
      return
    }
    const q = result.data
    if (seen.has(q.id)) problems.push(`${q.id}: duplicate id (also in ${seen.get(q.id)})`)
    seen.set(q.id, file)
    if (!file.startsWith(q.section)) {
      problems.push(`${q.id}: section "${q.section}" does not match file ${file}`)
    }
    const texts = q.options.map((o) => o.text.trim().toLowerCase())
    if (new Set(texts).size !== 4) problems.push(`${q.id}: duplicate option text`)
    // Options are shuffled per session, so authored position carries no meaning.
    // Any prose that points at a letter is wrong for three readers out of four.
    // Lowercase "(a)" only, and not preceded by a letter — so "L(A) < L(B)" is fine.
    const positional = /(?<![A-Za-z])\([a-d]\)|\b(?:option|answer) [a-d]\b/
    for (const [where, text] of [
      ['explanation', q.explanation],
      ...q.options.map((o) => [`option ${o.id}.why`, o.why] as const),
    ] as const) {
      const hit = positional.exec(text)
      if (hit) {
        problems.push(
          `${q.id}: ${where} refers to "${hit[0]}" — options are shuffled, so describe the option instead`,
        )
      }
    }
    all.push(q)
  })
}

if (problems.length) {
  console.error(`\n✗ ${problems.length} content problem(s):\n`)
  for (const p of problems) console.error(`  ${p}`)
  process.exit(1)
}

const by = <K extends string>(fn: (q: Question) => K) =>
  all.reduce<Record<string, number>>((acc, q) => ((acc[fn(q)] = (acc[fn(q)] ?? 0) + 1), acc), {})

console.log(`\n✓ ${all.length} questions valid\n`)
console.table(by((q) => q.section))
console.table(by((q) => q.difficulty))
console.table(by((q) => q.type))
