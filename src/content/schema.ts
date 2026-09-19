import { z } from 'zod'

export const SECTION_IDS = [
  'distributed-systems',
  'ai-engineering',
  'communication',
  'leadership',
] as const

export const QUESTION_TYPES = [
  'recall',
  'diagnosis',
  'tradeoff',
  'spot-the-flaw',
  'communication',
] as const

export const DIFFICULTIES = ['senior', 'staff', 'principal'] as const

const OptionSchema = z.object({
  id: z.enum(['a', 'b', 'c', 'd']),
  text: z.string().min(2),
  correct: z.boolean(),
  /** Why this is right, or the specific misconception it encodes. Required on every option. */
  why: z.string().min(40, 'every option needs a real `why` — no filler distractors'),
}).strict()

export const QuestionSchema = z
  .object({
    id: z.string().regex(/^[a-z]+-\d{3}$/, 'id must look like "dist-001"'),
    section: z.enum(SECTION_IDS),
    topic: z.string().min(2),
    /** Finer-grained label shown on the question; `topic` is the drillable unit. */
    subtopic: z.string().min(2).optional(),
    type: z.enum(QUESTION_TYPES),
    difficulty: z.enum(DIFFICULTIES),
    stem: z.string().min(20),
    code: z.object({ lang: z.string(), content: z.string() }).optional(),
    options: z.array(OptionSchema).length(4),
    explanation: z.string(),
    keyTakeaway: z.string().min(10).max(200),
    references: z
      .array(z.object({ label: z.string(), url: z.string().url().optional() }).strict())
      .optional(),
  })
  .strict()
  .refine((q) => q.options.filter((o) => o.correct).length === 1, {
    message: 'exactly one option must be correct',
    path: ['options'],
  })
  .refine((q) => new Set(q.options.map((o) => o.id)).size === 4, {
    message: 'option ids must be a, b, c, d — no duplicates',
    path: ['options'],
  })
  .refine((q) => q.explanation.trim().split(/\s+/).length >= 90, {
    message: 'explanation is the product — write at least 90 words',
    path: ['explanation'],
  })
  .refine(
    (q) => q.type !== 'tradeoff' || /\d|\b(budget|team|scale|latency|SLA|SLO|cost|region|QPS|rps|users|month|ms|GB|TB)\b/i.test(q.stem),
    {
      message: 'tradeoff stems must carry concrete constraints, or the answer is "it depends"',
      path: ['stem'],
    },
  )

export type Question = z.infer<typeof QuestionSchema>
export type SectionId = (typeof SECTION_IDS)[number]
export type QuestionType = (typeof QUESTION_TYPES)[number]
export type Difficulty = (typeof DIFFICULTIES)[number]

export const QuestionFileSchema = z.array(QuestionSchema)
