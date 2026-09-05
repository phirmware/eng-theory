import { create } from 'zustand'
import { bucketOf, db, type Confidence, type Bucket } from '@/db'
import { BY_ID } from '@/content'
import type { Question } from '@/content/schema'
import { shuffle } from '@/shuffle'
import { clampDue, newCard, review } from '@/srs'

export type SessionKind = 'section' | 'due' | 'blind-spots' | 'mock'

export type Answered = {
  question: Question
  chosen: string
  correct: boolean
  confidence: Confidence
  bucket: Bucket
}

type State = {
  kind: SessionKind
  label: string
  queue: string[]
  /** Per-question option order for this session. Authored position must never be a signal. */
  order: Record<string, string[]>
  index: number
  selected: string | null
  revealed: boolean
  startedAt: number
  log: Answered[]
  start: (kind: SessionKind, label: string, ids: string[]) => void
  optionsFor: (q: Question) => Question['options']
  select: (optionId: string) => void
  submit: (confidence: Confidence) => Promise<void>
  next: () => void
  current: () => Question | null
}

export const useSession = create<State>((set, get) => ({
  kind: 'section',
  label: '',
  queue: [],
  order: {},
  index: 0,
  selected: null,
  revealed: false,
  startedAt: Date.now(),
  log: [],

  start: (kind, label, ids) =>
    set({
      kind,
      label,
      queue: ids,
      order: Object.fromEntries(
        ids.map((id) => [id, shuffle((BY_ID.get(id)?.options ?? []).map((o) => o.id))]),
      ),
      index: 0,
      selected: null,
      revealed: false,
      log: [],
      startedAt: Date.now(),
    }),

  optionsFor: (q) => {
    const ids = get().order[q.id]
    if (!ids) return q.options
    return ids.map((id) => q.options.find((o) => o.id === id)!).filter(Boolean)
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
    set({ revealed: true, log: [...get().log, { question, chosen: selected, correct, confidence, bucket }] })

    const ms = Date.now() - get().startedAt
    await db.attempts.add({
      questionId: question.id,
      section: question.section,
      topic: question.topic,
      chosen: selected,
      correct,
      confidence,
      bucket,
      ms,
      at: Date.now(),
    })

    const existing = await db.cards.get(question.id)
    const base = existing?.card ?? newCard()
    const scheduled = clampDue(review(base, bucket), bucket)
    await db.cards.put({
      questionId: question.id,
      section: question.section,
      card: scheduled,
      due: new Date(scheduled.due).getTime(),
      lastBucket: bucket,
      seen: (existing?.seen ?? 0) + 1,
    })
  },

  next: () =>
    set((s) => ({ index: s.index + 1, selected: null, revealed: false, startedAt: Date.now() })),

  current: () => {
    const { queue, index } = get()
    return index < queue.length ? BY_ID.get(queue[index]) ?? null : null
  },
}))

export { shuffle }
