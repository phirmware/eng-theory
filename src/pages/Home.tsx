import { useNavigate } from 'react-router-dom'
import { SECTIONS } from '@/content/sections'
import { questionsIn } from '@/content'
import { Bar, Stat } from '@/components/Bits'
import { useStats } from '@/store/stats'
import { shuffle, useSession } from '@/store/session'
import { exportAll, importAll } from '@/db'

export default function Home() {
  const nav = useNavigate()
  const { stats, dueIds, blindSpotIds, loading, refresh } = useStats()
  const start = useSession((s) => s.start)

  const totals = Object.values(stats).reduce(
    (a, s) => ({ total: a.total + s.total, seen: a.seen + s.seen }),
    { total: 0, seen: 0 },
  )
  const attempted = Object.values(stats).filter((s) => s.accuracy !== null)
  const avg = (pick: (s: (typeof attempted)[number]) => number | null) =>
    attempted.length ? attempted.reduce((a, s) => a + (pick(s) ?? 0), 0) / attempted.length : null

  const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`)

  const go = async (kind: Parameters<typeof start>[0], label: string, ids: string[]) => {
    if (!ids.length) return
    await start(kind, label, ids)
    nav('/session')
  }

  const doExport = async () => {
    const blob = new Blob([JSON.stringify(await exportAll(), null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `study-progress-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const doImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      await importAll(JSON.parse(String(reader.result)))
      await refresh()
    }
    reader.readAsText(file)
  }

  if (loading) return <div className="p-10 text-muted">Loading…</div>

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] sm:px-5 sm:py-10">
      <header className="mb-8">
        <h1 className="text-[22px] font-semibold tracking-tight sm:text-2xl">Engineering Theory</h1>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted">
          Retrieval practice for senior and staff engineering. Answer, declare how sure you are, read
          why the other three are wrong. Confidently-wrong answers come back hardest.
        </p>
      </header>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Due now" value={dueIds.length} hint="scheduled by FSRS" />
        <Stat label="Blind spots" value={blindSpotIds.length} hint="sure, and wrong" />
        <Stat label="Accuracy" value={pct(avg((s) => s.accuracy))} hint="all attempts" />
        <Stat label="Calibration" value={pct(avg((s) => s.calibration))} hint="knew that you knew" />
      </div>

      <div className="mb-10 grid gap-3 sm:grid-cols-2">
        <button
          onClick={() => void go('due', 'Due queue', dueIds.slice(0, 25))}
          disabled={!dueIds.length}
          className="tap-press rounded-lg border border-accent/40 bg-accent/10 p-4 text-left transition-colors enabled:hover:bg-accent/20 disabled:opacity-40"
        >
          <div className="font-medium">Review due · {dueIds.length}</div>
          <div className="mt-1 text-[13px] text-muted">
            {dueIds.length ? 'The daily driver. Spaced repetition picks what you are about to forget.' : 'Nothing due. Practise a section below.'}
          </div>
        </button>
        <button
          onClick={() => void go('blind-spots', 'Blind spots', shuffle(blindSpotIds))}
          disabled={!blindSpotIds.length}
          className="tap-press rounded-lg border border-bad/40 bg-bad/10 p-4 text-left transition-colors enabled:hover:bg-bad/20 disabled:opacity-40"
        >
          <div className="font-medium">Drill blind spots · {blindSpotIds.length}</div>
          <div className="mt-1 text-[13px] text-muted">
            {blindSpotIds.length ? 'Questions you got wrong while certain. The highest-value minutes in the app.' : 'None yet — you have not been confidently wrong.'}
          </div>
        </button>
      </div>

      <h2 className="mb-3 text-[11px] uppercase tracking-wider text-muted">Sections</h2>
      <div className="space-y-3">
        {SECTIONS.map((section) => {
          const s = stats[section.id] ?? { total: 0, seen: 0, due: 0, confidentWrong: 0, accuracy: null, calibration: null }
          const all = questionsIn(section.id)
          return (
            <div key={section.id} className="rounded-lg border border-line bg-surface p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium" style={{ color: section.accent }}>{section.title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">{section.blurb}</p>
                </div>
                <div className="flex w-full gap-2 sm:w-auto">
                  <button
                    onClick={() => nav(`/section/${section.id}`)}
                    className="tap-press min-h-[44px] flex-1 rounded-lg border border-line px-3 text-[14px] hover:border-muted sm:min-h-0 sm:flex-none sm:py-2 sm:text-[13px]"
                  >
                    Topics
                  </button>
                  <button
                    onClick={() => void go('section', section.title, shuffle(all.map((q) => q.id)).slice(0, 20))}
                    className="tap-press min-h-[44px] flex-1 rounded-lg bg-raised px-3 text-[14px] font-medium hover:bg-line sm:min-h-0 sm:flex-none sm:py-2 sm:text-[13px]"
                  >
                    Practise 20
                  </button>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Bar value={s.total ? s.seen / s.total : 0} color={section.accent} />
                <span className="shrink-0 text-xs tabular-nums text-muted">
                  {s.seen}/{s.total} seen
                  {s.confidentWrong > 0 && <span className="text-bad"> · {s.confidentWrong} blind</span>}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <footer className="mt-12 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-5 text-xs text-muted">
        <span>{totals.seen}/{totals.total} questions seen</span>
        <span className="ml-auto" />
        <button onClick={() => void doExport()} className="hover:text-white">Export progress</button>
        <label className="cursor-pointer hover:text-white">
          Import
          <input type="file" accept="application/json" className="hidden" onChange={doImport} />
        </label>
      </footer>
    </div>
  )
}
