import { createEmptyCard, fsrs, generatorParameters, Rating, type Card, type Grade } from 'ts-fsrs'
import type { Bucket, Recalled } from './db'

const scheduler = fsrs(generatorParameters({ enable_fuzz: true, maximum_interval: 365 }))

/**
 * Confidence is the whole point: a confidently-wrong answer is a belief actively
 * making you worse, so it gets the harshest schedule. An unsure-but-right answer
 * is shaky knowledge and must not be treated as mastered.
 */
const RATING_FOR: Record<Bucket, Grade> = {
  'confident-right': Rating.Easy,
  'unsure-right': Rating.Hard,
  'unsure-wrong': Rating.Again,
  'confident-wrong': Rating.Again,
}

/**
 * Free recall is strictly harder than multiple choice, so a clean recall earns a
 * longer interval than a clean pick — and a miss is a miss regardless of whether
 * you would have recognised the answer in a list.
 */
const RATING_FOR_RECALL: Record<Recalled, Grade> = {
  nailed: Rating.Easy,
  partly: Rating.Hard,
  missed: Rating.Again,
}

/** A recall self-grade expressed in the same four buckets the rest of the app uses. */
export function bucketOfRecall(r: Recalled): Bucket {
  if (r === 'nailed') return 'confident-right'
  if (r === 'partly') return 'unsure-right'
  return 'unsure-wrong'
}

export function reviewRecall(card: Card, r: Recalled, now = new Date()) {
  return scheduler.next(card, now, RATING_FOR_RECALL[r]).card
}

export function newCard(): Card {
  return createEmptyCard(new Date())
}

export function review(card: Card, bucket: Bucket, now = new Date()) {
  const result = scheduler.next(card, now, RATING_FOR[bucket])
  return result.card
}

/** Confidently wrong comes back tomorrow at the latest, whatever FSRS says. */
export function clampDue(card: Card, bucket: Bucket): Card {
  if (bucket !== 'confident-wrong') return card
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
  return card.due > tomorrow ? { ...card, due: tomorrow } : card
}
