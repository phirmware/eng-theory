import { createEmptyCard, fsrs, generatorParameters, Rating, type Card, type Grade } from 'ts-fsrs'
import type { Bucket } from './db'

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
