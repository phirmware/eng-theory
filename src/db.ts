import Dexie, { type Table } from 'dexie'
import type { Card } from 'ts-fsrs'

export type Confidence = 'sure' | 'unsure'

/** The four buckets. `confident-wrong` is the one that matters. */
export type Bucket = 'confident-right' | 'unsure-right' | 'unsure-wrong' | 'confident-wrong'

export function bucketOf(correct: boolean, confidence: Confidence): Bucket {
  if (correct) return confidence === 'sure' ? 'confident-right' : 'unsure-right'
  return confidence === 'sure' ? 'confident-wrong' : 'unsure-wrong'
}

export type Attempt = {
  id?: number
  questionId: string
  section: string
  topic: string
  chosen: string
  correct: boolean
  confidence: Confidence
  bucket: Bucket
  ms: number
  at: number
}

export type CardRow = {
  questionId: string
  section: string
  card: Card
  due: number
  lastBucket: Bucket | null
  seen: number
}

class StudyDb extends Dexie {
  attempts!: Table<Attempt, number>
  cards!: Table<CardRow, string>

  constructor() {
    super('engineer-theory')
    this.version(1).stores({
      attempts: '++id, questionId, section, at, bucket',
      cards: 'questionId, section, due, lastBucket',
    })
  }
}

export const db = new StudyDb()

export async function exportAll() {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    attempts: await db.attempts.toArray(),
    cards: await db.cards.toArray(),
  }
}

export async function importAll(data: { attempts: Attempt[]; cards: CardRow[] }) {
  await db.transaction('rw', db.attempts, db.cards, async () => {
    await db.attempts.clear()
    await db.cards.clear()
    await db.attempts.bulkAdd(data.attempts.map(({ id: _id, ...a }) => a as Attempt))
    await db.cards.bulkPut(data.cards)
  })
}
