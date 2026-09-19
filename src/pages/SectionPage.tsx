import { useNavigate, useParams } from 'react-router-dom'
import { questionsIn, subtopicsIn, topicsIn } from '@/content'
import { SECTION_BY_ID } from '@/content/sections'
import type { SectionId } from '@/content/schema'
import { shuffle, useSession } from '@/store/session'

export default function SectionPage() {
  const { id } = useParams<{ id: SectionId }>()
  const nav = useNavigate()
  const start = useSession((s) => s.start)
  const section = id ? SECTION_BY_ID[id] : undefined
  if (!section) return <div className="p-10 text-muted">Unknown section.</div>

  const topics = topicsIn(section.id).sort((a, b) => b.count - a.count)

  const drill = async (topic: string) => {
    const ids = questionsIn(section.id).filter((q) => q.topic === topic).map((q) => q.id)
    await start('section', `${section.title} · ${topic}`, shuffle(ids))
    nav('/session')
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] sm:px-5 sm:py-10">
      <button onClick={() => nav('/')} className="-ml-2 mb-5 rounded px-2 py-1.5 text-sm text-muted hover:text-white">← All sections</button>
      <h1 className="text-xl font-semibold" style={{ color: section.accent }}>{section.title}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{section.blurb}</p>

      <h2 className="mt-8 mb-3 text-[11px] uppercase tracking-wider text-muted">Drill a topic</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {topics.map(({ topic, count }) => (
          <button
            key={topic}
            onClick={() => void drill(topic)}
            className="tap-press rounded-lg border border-line bg-surface px-4 py-3.5 text-left hover:border-muted active:border-muted"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-[14px]">{topic}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted">{count}</span>
            </div>
            <div className="mt-1.5 text-[12px] leading-relaxed text-muted">
              {subtopicsIn(section.id, topic).join(' · ')}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
