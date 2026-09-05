import { useEffect, useState } from 'react'
import { db, type Bucket } from '@/db'
import { QUESTIONS } from '@/content'
import type { SectionId } from '@/content/schema'

export type SectionStats = {
  total: number
  seen: number
  due: number
  confidentWrong: number
  accuracy: number | null
  calibration: number | null
}

const EMPTY: SectionStats = {
  total: 0, seen: 0, due: 0, confidentWrong: 0, accuracy: null, calibration: null,
}

export function useStats() {
  const [stats, setStats] = useState<Record<string, SectionStats>>({})
  const [dueIds, setDueIds] = useState<string[]>([])
  const [blindSpotIds, setBlindSpotIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    const [cards, attempts] = await Promise.all([db.cards.toArray(), db.attempts.toArray()])
    const now = Date.now()
    const cardById = new Map(cards.map((c) => [c.questionId, c]))

    const bySection: Record<string, SectionStats> = {}
    for (const q of QUESTIONS) {
      const s = (bySection[q.section] ??= { ...EMPTY })
      s.total++
      const card = cardById.get(q.id)
      if (card) {
        s.seen++
        if (card.due <= now) s.due++
        if (card.lastBucket === 'confident-wrong') s.confidentWrong++
      }
    }

    const attemptsBySection = new Map<string, { right: number; n: number; calibrated: number }>()
    for (const a of attempts) {
      const e = attemptsBySection.get(a.section) ?? { right: 0, n: 0, calibrated: 0 }
      e.n++
      if (a.correct) e.right++
      // Calibrated = you knew whether you knew: sure+right, or unsure+wrong.
      if (a.correct === (a.confidence === 'sure')) e.calibrated++
      attemptsBySection.set(a.section, e)
    }
    for (const [section, e] of attemptsBySection) {
      const s = bySection[section]
      if (!s) continue
      s.accuracy = e.n ? e.right / e.n : null
      s.calibration = e.n ? e.calibrated / e.n : null
    }

    setStats(bySection)
    setDueIds(cards.filter((c) => c.due <= now).sort((a, b) => a.due - b.due).map((c) => c.questionId))
    setBlindSpotIds(cards.filter((c) => c.lastBucket === 'confident-wrong').map((c) => c.questionId))
    setLoading(false)
  }

  useEffect(() => { void refresh() }, [])

  const unseenIn = (section: SectionId) => {
    const s = stats[section]
    return s ? s.total - s.seen : 0
  }

  return { stats, dueIds, blindSpotIds, loading, refresh, unseenIn }
}

export const BUCKET_LABEL: Record<Bucket, string> = {
  'confident-right': 'Solid',
  'unsure-right': 'Lucky — shaky',
  'unsure-wrong': 'Known gap',
  'confident-wrong': 'Blind spot',
}

export const BUCKET_COLOR: Record<Bucket, string> = {
  'confident-right': 'var(--color-good)',
  'unsure-right': 'var(--color-warn)',
  'unsure-wrong': 'var(--color-muted)',
  'confident-wrong': 'var(--color-bad)',
}
