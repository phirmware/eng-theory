import { useEffect, useRef, useState } from 'react'

/**
 * Deliberately tiny: inline code, emphasis, and paragraph breaks are all the
 * explanations need. Avoids a markdown dependency for five features.
 */
export function Rich({
  text,
  className = '',
  inline = false,
}: {
  text: string
  className?: string
  /** Skip paragraph wrapping — for option text and per-option rationales. */
  inline?: boolean
}) {
  const html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/`([^`]+)`/g, '<code class="rounded bg-raised px-1.5 py-0.5 text-[0.9em] text-accent">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white">$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em class="text-white not-italic underline decoration-line underline-offset-2">$1</em>')
    .split('\n\n')
    .map((p) => (inline ? p : `<p class="mb-3 last:mb-0">${p}</p>`))
    .join(inline ? ' ' : '')
  return inline ? (
    <span className={className} dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
  )
}

export function Code({ lang, content }: { lang: string; content: string }) {
  const scroller = useRef<HTMLPreElement>(null)
  const [atEnd, setAtEnd] = useState(true)

  // Code overflows constantly on a phone. Fade the right edge while there is
  // more to see, so the block reads as swipeable rather than truncated.
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const update = () => {
      const more = el.scrollWidth - el.clientWidth - el.scrollLeft
      setAtEnd(more <= 1)
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [content])

  return (
    <div className="relative my-4">
      <pre
        ref={scroller}
        className="overflow-x-auto overscroll-x-contain rounded-lg border border-line bg-[#0a0e13] p-3 text-[12px] leading-relaxed sm:p-4 sm:text-[13px]"
      >
        <div className="mb-2 text-[11px] uppercase tracking-wider text-muted">{lang}</div>
        <code className="text-[#c9d1d9]">{content}</code>
      </pre>
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-lg bg-gradient-to-l from-[#0a0e13] to-transparent transition-opacity ${
          atEnd ? 'opacity-0' : 'opacity-100'
        }`}
      />
    </div>
  )
}
