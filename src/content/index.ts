import distributedSystems from './questions/distributed-systems.json'
import aiEngineering from './questions/ai-engineering.json'
import communication from './questions/communication.json'
import leadership from './questions/leadership.json'
import { QuestionFileSchema, type Question, type SectionId } from './schema'

const raw = [...distributedSystems, ...aiEngineering, ...communication, ...leadership]

// Parsed once at module load. In dev this surfaces bad content immediately;
// `pnpm validate` runs the same schema in CI so bad questions never ship.
export const QUESTIONS: Question[] = QuestionFileSchema.parse(raw)

export const BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]))

export function questionsIn(section: SectionId) {
  return QUESTIONS.filter((q) => q.section === section)
}

export function topicsIn(section: SectionId) {
  const counts = new Map<string, number>()
  for (const q of questionsIn(section)) {
    counts.set(q.topic, (counts.get(q.topic) ?? 0) + 1)
  }
  return [...counts.entries()].map(([topic, count]) => ({ topic, count }))
}

export function subtopicsIn(section: SectionId, topic: string) {
  const seen = new Set<string>()
  for (const q of questionsIn(section)) {
    if (q.topic === topic && q.subtopic) seen.add(q.subtopic)
  }
  return [...seen]
}
