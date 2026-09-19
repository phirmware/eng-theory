import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Code, Rich } from '@/components/Markdown'
import { Pill } from '@/components/Bits'
import { GoDeeper } from '@/components/GoDeeper'
import { NoteEditor, NoteRecall } from '@/components/NoteEditor'
import { useSession } from '@/store/session'
import { BUCKET_COLOR, BUCKET_LABEL } from '@/store/stats'

const DIFFICULTY_TONE: Record<string, string> = {
  senior: '#8b98a9',
  staff: '#4c9aff',
  principal: '#a371f7',
}

export default function Session() {
  const nav = useNavigate()
  const {
    queue, index, selected, revealed, graded, label,
    select, submit, reveal, gradeRecall, next, current, log, optionsFor, isRecall,
  } = useSession()
  const question = current()
  const shown = question ? optionsFor(question) : []
  const recall = isRecall()
  const optionsRef = useRef<HTMLDivElement>(null)

  // New question starts at the top — otherwise you land mid-page after a long reveal.
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [index])

  // On reveal, bring the graded options into view so the result is visible
  // without hunting for it on a small screen.
  useEffect(() => {
    if (revealed) optionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [revealed])

  useEffect(() => {
    if (queue.length === 0) nav('/')
  }, [queue.length, nav])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!question) return
      const key = e.key.toLowerCase()
      if (recall) {
        if (!revealed && (key === 'enter' || key === ' ')) {
          e.preventDefault()
          reveal()
          return
        }
        if (revealed && !graded) {
          if (key === '1') void gradeRecall('missed')
          if (key === '2') void gradeRecall('partly')
          if (key === '3') void gradeRecall('nailed')
          return
        }
      } else {
        const slot = ['a', 'b', 'c', 'd'].indexOf(key)
        if (!revealed && slot >= 0 && shown[slot]) select(shown[slot].id)
        if (!revealed && selected && key === 's') void submit('sure')
        if (!revealed && selected && key === 'u') void submit('unsure')
      }
      if (graded && (key === 'enter' || key === ' ')) {
        e.preventDefault()
        advance()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const advance = () => {
    if (index + 1 >= queue.length) nav('/results')
    else next()
  }

  if (!question) return null

  const last = log[log.length - 1]
  const correctId = question.options.find((o) => o.correct)!.id

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] sm:px-5 sm:py-8">
      <header className="mb-6 flex items-center justify-between gap-4">
        <button
          onClick={() => nav('/')}
          className="-ml-2 min-w-0 truncate rounded px-2 py-1.5 text-left text-sm text-muted hover:text-white"
        >
          ← {label}
        </button>
        <div className="shrink-0 text-sm text-muted tabular-nums">
          {index + 1} / {queue.length}
        </div>
      </header>

      <div className="mb-6 h-1 w-full overflow-hidden rounded-full bg-raised">
        <div
          className="h-full bg-accent transition-all duration-300"
          style={{ width: `${((index + (revealed ? 1 : 0)) / queue.length) * 100}%` }}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Pill tone={DIFFICULTY_TONE[question.difficulty]}>{question.difficulty}</Pill>
        <Pill>{question.type.replace(/-/g, ' ')}</Pill>
        {recall && <Pill tone="var(--color-accent)">from memory</Pill>}
        <span className="text-xs text-muted">
          {question.topic}
          {question.subtopic && <span className="text-muted/60"> · {question.subtopic}</span>}
        </span>
      </div>

      <Rich text={question.stem} className="text-[17px] leading-relaxed text-[#e6edf3] sm:text-lg" />
      {question.code && <Code lang={question.code.lang} content={question.code.content} />}

      {recall && !revealed && (
        <div className="mt-5 rounded-lg border border-dashed border-accent/40 bg-accent/5 p-4">
          <div className="text-[11px] uppercase tracking-wider text-accent">From memory</div>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            You have answered this cleanly twice, so the options are hidden. Answer it in your head —
            or out loud — then reveal and grade yourself honestly.
          </p>
        </div>
      )}

      {recall && !revealed && <NoteRecall questionId={question.id} />}

      <div ref={optionsRef} className={`scroll-clear mt-6 space-y-2.5 ${recall && !revealed ? 'hidden' : ''}`}>
        {shown.map((opt, slot) => {
          const isChosen = selected === opt.id
          const isCorrect = opt.id === correctId
          let border = 'border-line'
          let bg = 'bg-surface'
          if (!revealed && isChosen) { border = 'border-accent'; bg = 'bg-accent/10' }
          if (revealed && isCorrect) { border = 'border-good'; bg = 'bg-good/10' }
          if (revealed && isChosen && !isCorrect) { border = 'border-bad'; bg = 'bg-bad/10' }

          return (
            <button
              key={opt.id}
              onClick={() => select(opt.id)}
              disabled={revealed}
              className={`tap-press w-full rounded-lg border ${border} ${bg} p-4 text-left transition-all ${
                revealed ? 'cursor-default' : 'select-none hover:border-muted active:border-muted'
              }`}
            >
              <div className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border border-line text-xs font-semibold uppercase text-muted">
                  {'abcd'[slot]}
                </span>
                <div className="flex-1">
                  <Rich inline text={opt.text} className="block text-[15px] leading-relaxed" />
                  {revealed && (
                    <div className="mt-2.5 border-t border-line/60 pt-2.5 text-[13px] leading-relaxed text-muted">
                      <span className={isCorrect ? 'text-good' : 'text-bad'}>
                        {isCorrect ? 'Correct. ' : 'Wrong. '}
                      </span>
                      <Rich inline text={opt.why} />
                    </div>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {graded && last && (
        <div className="mt-8 space-y-5">
          <div
            className="rounded-lg border p-4"
            style={{ borderColor: `${BUCKET_COLOR[last.bucket]}55`, background: `${BUCKET_COLOR[last.bucket]}12` }}
          >
            <div className="text-sm font-semibold" style={{ color: BUCKET_COLOR[last.bucket] }}>
              {BUCKET_LABEL[last.bucket]}
            </div>
            <div className="mt-1 text-[13px] text-muted">
              {last.bucket === 'confident-wrong' &&
                'You were sure and you were wrong. This is a belief actively costing you — it comes back tomorrow.'}
              {last.bucket === 'unsure-right' &&
                'Right answer, no conviction. Treated as unlearned so it comes back soon.'}
              {last.bucket === 'unsure-wrong' && 'An honest gap. Scheduled for review.'}
              {last.bucket === 'confident-right' && 'Known and known-to-be-known. Long interval.'}
            </div>
          </div>

          <div className="rounded-lg border border-line bg-surface p-5">
            <div className="mb-3 text-[11px] uppercase tracking-wider text-muted">Explanation</div>
            <Rich text={question.explanation} className="text-[15px] leading-relaxed text-[#c9d1d9]" />
          </div>

          <div className="rounded-lg border-l-2 border-accent bg-accent/5 px-4 py-3">
            <div className="text-[11px] uppercase tracking-wider text-accent">Takeaway</div>
            <Rich inline text={question.keyTakeaway} className="mt-1 block text-[15px] leading-relaxed" />
          </div>

          <GoDeeper
            attempt={{
              question,
              chosen: last.chosen,
              correct: last.correct,
              confidence: last.confidence,
              mode: last.mode,
              recalled: last.recalled,
            }}
          />

          <NoteEditor questionId={question.id} />

          {question.references && question.references.length > 0 && (
            <div className="text-[13px] text-muted">
              {question.references.map((r, i) => (
                <span key={i}>
                  {i > 0 && ' · '}
                  {r.url ? (
                    <a href={r.url} target="_blank" rel="noreferrer" className="underline hover:text-white">
                      {r.label}
                    </a>
                  ) : (
                    r.label
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-ink/95 backdrop-blur">
        <div className="pb-safe mx-auto flex max-w-3xl items-center gap-2.5 px-4 pt-3 sm:gap-3 sm:px-5 sm:pt-4">
          {recall && !revealed ? (
            <button
              onClick={reveal}
              className="tap-press min-h-[52px] w-full rounded-lg bg-accent px-6 text-[15px] font-semibold text-ink sm:min-h-0 sm:w-auto sm:flex-1 sm:py-3 sm:text-sm"
            >
              Show answer
              <span className="ml-1 hidden opacity-60 sm:inline">↵</span>
            </button>
          ) : recall && !graded ? (
            <>
              <div className="hidden flex-1 text-[13px] text-muted sm:block">How did you do?</div>
              <button
                onClick={() => void gradeRecall('missed')}
                className="tap-press min-h-[52px] flex-1 rounded-lg border border-line px-2 text-[14px] font-medium hover:border-bad hover:text-bad sm:min-h-0 sm:flex-none sm:px-4 sm:py-3 sm:text-sm"
              >
                Missed<span className="ml-1 hidden text-muted sm:inline">1</span>
              </button>
              <button
                onClick={() => void gradeRecall('partly')}
                className="tap-press min-h-[52px] flex-1 rounded-lg border border-line px-2 text-[14px] font-medium hover:border-warn hover:text-warn sm:min-h-0 sm:flex-none sm:px-4 sm:py-3 sm:text-sm"
              >
                Partly<span className="ml-1 hidden text-muted sm:inline">2</span>
              </button>
              <button
                onClick={() => void gradeRecall('nailed')}
                className="tap-press min-h-[52px] flex-1 rounded-lg bg-accent px-2 text-[14px] font-semibold text-ink sm:min-h-0 sm:flex-none sm:px-4 sm:py-3 sm:text-sm"
              >
                Nailed<span className="ml-1 hidden opacity-60 sm:inline">3</span>
              </button>
            </>
          ) : !revealed ? (
            <>
              <div className="hidden flex-1 text-[13px] text-muted sm:block">
                {selected ? 'How sure are you?' : 'Pick an answer'}
              </div>
              <button
                onClick={() => void submit('unsure')}
                disabled={!selected}
                className="tap-press min-h-[52px] flex-1 rounded-lg border border-line px-4 text-[15px] font-medium transition-colors enabled:hover:border-warn enabled:hover:text-warn disabled:opacity-30 sm:min-h-0 sm:flex-none sm:py-3 sm:text-sm"
              >
                Not sure <span className="ml-1 hidden text-muted sm:inline">U</span>
              </button>
              <button
                onClick={() => void submit('sure')}
                disabled={!selected}
                className="tap-press min-h-[52px] flex-1 rounded-lg bg-accent px-4 text-[15px] font-semibold text-ink transition-opacity disabled:opacity-30 sm:min-h-0 sm:flex-none sm:py-3 sm:text-sm"
              >
                I'm sure <span className="ml-1 hidden opacity-60 sm:inline">S</span>
              </button>
            </>
          ) : (
            <button
              onClick={advance}
              className="tap-press min-h-[52px] w-full rounded-lg bg-accent px-6 text-[15px] font-semibold text-ink sm:ml-auto sm:min-h-0 sm:w-auto sm:py-3 sm:text-sm"
            >
              {index + 1 >= queue.length ? 'Finish' : 'Next'}
              <span className="ml-1 hidden opacity-60 sm:inline">↵</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
