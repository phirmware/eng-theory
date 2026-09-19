import { create } from 'zustand'
import {
  bucketOf,
  db,
  RECALL_AT_STREAK,
  type Bucket,
  type Confidence,
  type Mode,
  type Recalled,
} from '@/db'
import { BY_ID } from '@/content'
import type { Question } from '@/content/schema'
import { shuffle } from '@/shuffle'
import { bucketOfRecall, clampDue, newCard, review, reviewRecall } from '@/srs'

export { shuffle }

export type SessionKind = 'section' | 'due' | 'blind-spots' | 'mock' | 'mixed'

export type Answered = {
  question: Question
  chosen?: string
  correct: boolean
  confidence: Confidence
  bucket: Bucket
  mode: Mode
  recalled?: Recalled
}

const RECALL_PREF = 'recall-mode-enabled'

export function recallEnabled() {
  try {
    return localStorage.getItem(RECALL_PREF) !== 'off'
  } catch {
    return true
  }
}

export function setRecallEnabled(on: boolean) {
  try {
    localStorage.setItem(RECALL_PREF, on ? 'on' : 'off')
  } catch {
    /* private mode */
  }
}

type State = {
  kind: SessionKind
  label: string
  queue: string[]
  order: Record<string, string[]>
  /** Questions promoted out of multiple choice for this session. */
  recallIds: string[]
  index: number
  selected: string | null
  revealed: boolean
  graded: boolean
  startedAt: number
  log: Answered[]
  start: (kind: SessionKind, label: string, ids: string[]) => Promise<void>
  select: (optionId: string) => void
  submit: (confidence: Confidence) => Promise<void>
  reveal: () => void
  gradeRecall: (r: Recalled) => Promise<void>
  next: () => void
  current: () => Question | null
  isRecall: () => boolean
  optionsFor: (q: Question) => Question['options']
}

/** One place that writes the card, so choice and recall stay in step. */
async function schedule(q: Question, bucket: Bucket, recalled?: Recalled) {
  const existing = await db.cards.get(q.id)
  const base = existing?.card ?? newCard()
  const next = recalled ? reviewRecall(base, recalled) : review(base, bucket)
  const scheduled = clampDue(next, bucket)
  const clean = bucket === 'confident-right'
  await db.cards.put({
    questionId: q.id,
    section: q.section,
    card: scheduled,
    due: new Date(scheduled.due).getTime(),
    lastBucket: bucket,
    seen: (existing?.seen ?? 0) + 1,
    streak: clean ? (existing?.streak ?? 0) + 1 : 0,
    lapses: (existing?.lapses ?? 0) + (bucket.endsWith('wrong') ? 1 : 0),
  })
}

export const useSession = create<State>((set, get) => ({
  kind: 'section',
  label: '',
  queue: [],
  order: {},
  recallIds: [],
  index: 0,
  selected: null,
  revealed: false,
  graded: false,
  startedAt: Date.now(),
  log: [],

  start: async (kind, label, ids) => {
    let recallIds: string[] = []
    if (recallEnabled()) {
      const rows = await db.cards.bulkGet(ids)
      recallIds = ids.filter((_, i) => (rows[i]?.streak ?? 0) >= RECALL_AT_STREAK)
    }
    set({
      kind,
      label,
      queue: ids,
      recallIds,
      order: Object.fromEntries(
        ids.map((id) => [id, shuffle((BY_ID.get(id)?.options ?? []).map((o) => o.id))]),
      ),
      index: 0,
      selected: null,
      revealed: false,
      graded: false,
      log: [],
      startedAt: Date.now(),
    })
  },

  select: (optionId) => {
    if (get().revealed) return
    set({ selected: optionId })
  },

  submit: async (confidence) => {
    const { selected, revealed } = get()
    const question = get().current()
    if (!question || !selected || revealed) return

    const correct = question.options.find((o) => o.id === selected)?.correct ?? false
    const bucket = bucketOf(correct, confidence)
    set({
      revealed: true,
      graded: true,
      log: [...get().log, { question, chosen: selected, correct, confidence, bucket, mode: 'choice' }],
    })

    await db.attempts.add({
      questionId: question.id,
      section: question.section,
      topic: question.topic,
      chosen: selected,
      correct,
      confidence,
      bucket,
      mode: 'choice',
      ms: Date.now() - get().startedAt,
      at: Date.now(),
    })
    await schedule(question, bucket)
  },

  reveal: () => {
    if (get().revealed) return
    set({ revealed: true })
  },

  gradeRecall: async (recalled) => {
    const question = get().current()
    if (!question || get().graded) return

    const bucket = bucketOfRecall(recalled)
    const correct = recalled !== 'missed'
    set({
      graded: true,
      revealed: true,
      log: [
        ...get().log,
        { question, correct, confidence: recalled === 'nailed' ? 'sure' : 'unsure', bucket, mode: 'recall', recalled },
      ],
    })

    await db.attempts.add({
      questionId: question.id,
      section: question.section,
      topic: question.topic,
      correct,
      confidence: recalled === 'nailed' ? 'sure' : 'unsure',
      bucket,
      mode: 'recall',
      recalled,
      ms: Date.now() - get().startedAt,
      at: Date.now(),
    })
    await schedule(question, bucket, recalled)
  },

  next: () =>
    set((s) => ({
      index: s.index + 1,
      selected: null,
      revealed: false,
      graded: false,
      startedAt: Date.now(),
    })),

  current: () => {
    const { queue, index } = get()
    return index < queue.length ? BY_ID.get(queue[index]) ?? null : null
  },

  isRecall: () => {
    const q = get().current()
    return !!q && get().recallIds.includes(q.id)
  },

  optionsFor: (q) => {
    const ids = get().order[q.id]
    if (!ids) return q.options
    return ids.map((id) => q.options.find((o) => o.id === id)!).filter(Boolean)
  },
}))
