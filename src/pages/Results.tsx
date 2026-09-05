import { useNavigate } from 'react-router-dom'
import { useSession } from '@/store/session'
import { BUCKET_COLOR, BUCKET_LABEL } from '@/store/stats'
import type { Bucket } from '@/db'
import { Stat } from '@/components/Bits'

const ORDER: Bucket[] = ['confident-wrong', 'unsure-wrong', 'unsure-right', 'confident-right']

export default function Results() {
  const nav = useNavigate()
  const { log, label } = useSession()

  if (!log.length) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-5 sm:py-10">
        <p className="text-muted">No session to show.</p>
        <button onClick={() => nav('/')} className="mt-4 text-accent hover:underline">Back to sections</button>
      </div>
    )
  }

  const right = log.filter((l) => l.correct).length
  const calibrated = log.filter((l) => l.correct === (l.confidence === 'sure')).length
  const byBucket = ORDER.map((b) => ({ bucket: b, items: log.filter((l) => l.bucket === b) }))
  const blind = byBucket[0].items

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] sm:px-5 sm:py-10">
      <div className="text-sm text-muted">{label}</div>
      <h1 className="mt-1 text-[22px] font-semibold sm:text-2xl">Session complete</h1>

      <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
        <Stat label="Score" value={`${right}/${log.length}`} />
        <Stat label="Calibration" value={`${Math.round((calibrated / log.length) * 100)}%`} hint="knew that you knew" />
        <Stat label="Blind spots" value={blind.length} hint="sure, and wrong" />
      </div>

      {blind.length > 0 && (
        <div className="mt-6 rounded-lg border border-bad/40 bg-bad/10 p-5">
          <h2 className="text-sm font-semibold text-bad">Read these again</h2>
          <p className="mt-1 text-[13px] text-muted">
            You answered these with conviction and got them wrong. That combination is worse than not
            knowing — it means you are acting on them at work. All {blind.length} are scheduled for tomorrow.
          </p>
          <ul className="mt-3 space-y-2">
            {blind.map((l) => (
              <li key={l.question.id} className="text-[14px] leading-relaxed">
                <span className="text-muted">{l.question.topic} — </span>
                {l.question.keyTakeaway}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 space-y-6">
        {byBucket.filter((g) => g.items.length && g.bucket !== 'confident-wrong').map((g) => (
          <div key={g.bucket}>
            <h2 className="mb-2 text-[11px] uppercase tracking-wider" style={{ color: BUCKET_COLOR[g.bucket] }}>
              {BUCKET_LABEL[g.bucket]} · {g.items.length}
            </h2>
            <ul className="space-y-1.5">
              {g.items.map((l) => (
                <li key={l.question.id} className="text-[14px] leading-relaxed text-muted">
                  <span className="text-[#c9d1d9]">{l.question.topic}</span> — {l.question.keyTakeaway}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <button
        onClick={() => nav('/')}
        className="tap-press mt-10 min-h-[52px] w-full rounded-lg bg-accent px-5 text-[15px] font-semibold text-ink sm:min-h-0 sm:w-auto sm:py-3 sm:text-sm"
      >
        Back to sections
      </button>
    </div>
  )
}
