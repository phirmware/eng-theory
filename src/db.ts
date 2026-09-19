import Dexie, { type Table } from 'dexie'
import type { Card } from 'ts-fsrs'

export type Confidence = 'sure' | 'unsure'

/** The four buckets. `confident-wrong` is the one that matters. */
export type Bucket = 'confident-right' | 'unsure-right' | 'unsure-wrong' | 'confident-wrong'

export function bucketOf(correct: boolean, confidence: Confidence): Bucket {
  if (correct) return confidence === 'sure' ? 'confident-right' : 'unsure-right'
  return confidence === 'sure' ? 'confident-wrong' : 'unsure-wrong'
}

/** How the question was posed. Recall hides the options entirely. */
export type Mode = 'choice' | 'recall'

/** Self-grade after a free-recall attempt. */
export type Recalled = 'missed' | 'partly' | 'nailed'

export type Attempt = {
  id?: number
  questionId: string
  section: string
  topic: string
  /** Absent on recall attempts — there were no options to choose from. */
  chosen?: string
  correct: boolean
  confidence: Confidence
  bucket: Bucket
  mode: Mode
  recalled?: Recalled
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
  /** Consecutive confident-and-correct answers. Drives promotion to recall. */
  streak?: number
  /** Times answered wrong in total — a high count means reps are not working. */
  lapses?: number
}

export type Note = {
  questionId: string
  text: string
  updatedAt: number
}

/** Two clean answers in a row and the options come off. */
export const RECALL_AT_STREAK = 2
/** Past this many lapses, more reps are not the answer. */
export const LEECH_AT_LAPSES = 4

class StudyDb extends Dexie {
  attempts!: Table<Attempt, number>
  cards!: Table<CardRow, string>
  notes!: Table<Note, string>

  constructor() {
    super('engineer-theory')
    this.version(1).stores({
      attempts: '++id, questionId, section, at, bucket',
      cards: 'questionId, section, due, lastBucket',
    })
    // v2 adds notes. Existing attempts predate free recall, so backfill the mode
    // rather than leaving it undefined and having every query special-case it.
    this.version(2)
      .stores({
        attempts: '++id, questionId, section, at, bucket, mode',
        cards: 'questionId, section, due, lastBucket',
        notes: 'questionId, updatedAt',
      })
      .upgrade((tx) => tx.table('attempts').toCollection().modify((a) => { a.mode ??= 'choice' }))
  }
}

export const db = new StudyDb()

export async function exportAll() {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    attempts: await db.attempts.toArray(),
    cards: await db.cards.toArray(),
    notes: await db.notes.toArray(),
  }
}

export async function importAll(data: { attempts: Attempt[]; cards: CardRow[]; notes?: Note[] }) {
  await db.transaction('rw', db.attempts, db.cards, db.notes, async () => {
    await db.attempts.clear()
    await db.cards.clear()
    await db.notes.clear()
    await db.attempts.bulkAdd(
      data.attempts.map(({ id: _id, ...a }) => ({ ...a, mode: a.mode ?? ('choice' as Mode) })),
    )
    await db.cards.bulkPut(data.cards)
    if (data.notes?.length) await db.notes.bulkPut(data.notes)
  })
}

export async function getNote(questionId: string) {
  return (await db.notes.get(questionId))?.text ?? ''
}

export async function saveNote(questionId: string, text: string) {
  const trimmed = text.trim()
  if (!trimmed) return db.notes.delete(questionId)
  return db.notes.put({ questionId, text: trimmed, updatedAt: Date.now() })
}
