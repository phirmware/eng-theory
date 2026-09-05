import { useEffect, useState } from 'react'
import { buildPrompt, copyText, PROVIDERS, type Attempted } from '@/deepen'

export function GoDeeper({ attempt }: { attempt: Attempted }) {
  const [copied, setCopied] = useState(false)
  const [canShare, setCanShare] = useState(false)

  useEffect(() => setCopied(false), [attempt.question.id])
  useEffect(() => setCanShare(typeof navigator !== 'undefined' && !!navigator.share), [])

  const full = buildPrompt(attempt)
  // URLs get truncated by some providers, so deep links carry the shorter form.
  const compact = buildPrompt(attempt, true)

  const onCopy = async () => {
    if (await copyText(full)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const onShare = async () => {
    try {
      await navigator.share({ title: attempt.question.topic, text: full })
    } catch {
      /* user dismissed */
    }
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-4 sm:p-5">
      <div className="text-[11px] uppercase tracking-wider text-muted">Go deeper</div>
      <p className="mt-1 text-[13px] leading-relaxed text-muted">
        Sends the question, your answer and the explanation, and asks for the mechanism behind it —
        including why the option you picked was tempting.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => void onCopy()}
          className="tap-press min-h-[44px] flex-1 rounded-lg bg-raised px-4 text-[14px] font-medium hover:bg-line sm:min-h-0 sm:flex-none sm:py-2.5"
        >
          {copied ? '✓ Copied' : 'Copy prompt'}
        </button>
        {canShare && (
          <button
            onClick={() => void onShare()}
            className="tap-press min-h-[44px] flex-1 rounded-lg border border-line px-4 text-[14px] font-medium hover:border-muted sm:min-h-0 sm:flex-none sm:py-2.5"
          >
            Share
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-[12px] text-muted">Open in</span>
        {PROVIDERS.map((p) => (
          <a
            key={p.id}
            href={p.href(compact)}
            target="_blank"
            rel="noreferrer noopener"
            className="tap-press rounded-md border border-line px-2.5 py-1.5 text-[13px] text-[#c9d1d9] hover:border-muted hover:text-white"
          >
            {p.label}
            {p.flaky && <span className="ml-1 text-muted">*</span>}
          </a>
        ))}
      </div>
      <p className="mt-2.5 text-[11px] leading-relaxed text-muted">
        * Google AI Mode is not enabled for every account or region. If a link lands on ordinary
        search results, copy the prompt instead — that always works.
      </p>
    </div>
  )
}
