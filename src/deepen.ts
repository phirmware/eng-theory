import type { Question } from '@/content/schema'
import type { Confidence, Mode, Recalled } from '@/db'

export type Attempted = {
  question: Question
  /** Absent when the question was posed as free recall. */
  chosen?: string
  correct: boolean
  confidence: Confidence
  mode?: Mode
  recalled?: Recalled
}

const letterOf = (q: Question, id: string) => {
  // Authored ids are stable; the shuffle only affects display. Label by authored
  // order so the prompt is reproducible regardless of what the screen showed.
  const i = q.options.findIndex((o) => o.id === id)
  return i >= 0 ? 'ABCD'[i] : '?'
}

/**
 * The point of this prompt is to get something *beyond* the explanation already
 * shown. So it hands over what was already said and asks the model not to repeat
 * it — and it names the specific wrong answer, which is what makes the response
 * address your misconception rather than the topic in general.
 */
export function buildPrompt(
  { question: q, chosen, correct, confidence, mode = 'choice', recalled }: Attempted,
  compact = false,
) {
  const correctOpt = q.options.find((o) => o.correct)!
  const chosenOpt = chosen ? q.options.find((o) => o.id === chosen) : undefined
  const topic = q.subtopic ? `${q.topic} — ${q.subtopic}` : q.topic

  const lines: string[] = compact
    ? [`Senior engineer studying ${topic}. Explain this properly.`, '', q.stem]
    : [
        `I'm a senior engineer studying ${topic}. Help me understand this properly.`,
        '',
        'QUESTION',
        q.stem,
      ]

  if (q.code) {
    lines.push('', '```' + q.code.lang, q.code.content, '```')
  }

  lines.push(
    '',
    ...q.options.map((o, i) => `${'ABCD'[i]}. ${o.text}`),
    '',
    `Correct answer: ${letterOf(q, correctOpt.id)}`,
    mode === 'recall'
      ? recalled === 'nailed'
        ? 'I answered this from memory with no options shown, and got it.'
        : recalled === 'partly'
          ? 'I tried to answer this from memory with no options shown, and only got part of it.'
          : 'I tried to answer this from memory with no options shown, and could not retrieve it.'
      : correct
        ? `I got this right${confidence === 'unsure' ? ', but I was guessing.' : '.'}`
        : `I answered ${letterOf(q, chosen!)} ("${chosenOpt?.text ?? ''}")${
            confidence === 'sure' ? ' and I was confident. I was wrong.' : '. I was unsure, and wrong.'
          }`,
  )

  if (!compact) {
    lines.push('', 'The explanation I was given:', q.explanation)
  }

  if (compact) {
    lines.push(
      '',
      `Explain the mechanism from first principles, ${
        mode === 'recall' && !correct
          ? 'then give me a mental hook that would let me reconstruct this from scratch next time'
          : correct
            ? 'then show an edge case where the obvious answer would be wrong'
            : `then why ${letterOf(q, chosen!)} was tempting and what mental model avoids that mistake`
      }, with a concrete example. Technical and concise; assume I know the fundamentals.`,
    )
  } else {
    lines.push('', 'What I want from you:')
    const asks = [
      'Explain the underlying mechanism from first principles — why this is true, not just that it is.',
      mode === 'recall' && !correct
        ? 'I could not retrieve this from memory. Give me a mental hook or derivation that would let me reconstruct it from first principles rather than memorise it.'
        : correct
          ? 'Show me an edge case or a situation where the "obvious" answer here would actually be wrong.'
          : `Explain why ${letterOf(q, chosen!)} was tempting, what mental model produces that mistake, and what model produces the right answer.`,
      'Give one concrete real-world example, with a code or config sketch if it helps.',
      'Tell me what to learn next, and a harder follow-up question an interviewer might ask.',
    ]
    lines.push(...asks.map((a, i) => `${i + 1}. ${a}`))
    lines.push(
      '',
      'Go beyond the explanation above rather than restating it. Be technical and concise; assume I know the fundamentals, and tell me if anything in that explanation is wrong or oversimplified.',
    )
  }

  return lines.join('\n')
}

export type Provider = {
  id: string
  label: string
  href: (prompt: string) => string
  /** Flagged in the UI — behaviour varies by account or region. */
  flaky?: boolean
}

export const PROVIDERS: Provider[] = [
  { id: 'claude', label: 'Claude', href: (p) => `https://claude.ai/new?q=${encodeURIComponent(p)}` },
  { id: 'chatgpt', label: 'ChatGPT', href: (p) => `https://chatgpt.com/?q=${encodeURIComponent(p)}` },
  {
    id: 'perplexity',
    label: 'Perplexity',
    href: (p) => `https://www.perplexity.ai/search?q=${encodeURIComponent(p)}`,
  },
  {
    id: 'google',
    label: 'Google AI Mode',
    href: (p) => `https://www.google.com/search?udm=50&q=${encodeURIComponent(p)}`,
    flaky: true,
  },
]

/** Clipboard API needs a secure context; fall back so localhost-over-IP still works. */
export async function copyText(text: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.cssText = 'position:fixed;top:-9999px;opacity:0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}
