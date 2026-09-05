import type { SectionId } from './schema'

export type Section = {
  id: SectionId
  title: string
  blurb: string
  accent: string
}

export const SECTIONS: Section[] = [
  {
    id: 'distributed-systems',
    title: 'Distributed Systems',
    blurb:
      'Consistency models, consensus, partial failure, idempotency, clocks, replication. The material senior interviews assume you already have.',
    accent: '#4c9aff',
  },
  {
    id: 'ai-engineering',
    title: 'AI Engineering',
    blurb:
      'Evals, RAG architecture, context and cost management, structured output, agent failure modes. The part of the job that did not exist five years ago.',
    accent: '#a371f7',
  },
]

export const SECTION_BY_ID = Object.fromEntries(
  SECTIONS.map((s) => [s.id, s]),
) as Record<SectionId, Section>
