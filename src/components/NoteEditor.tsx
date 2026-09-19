import { useEffect, useRef, useState } from 'react'
import { getNote, saveNote } from '@/db'

/**
 * Writing the idea in your own words is the point — not storing it. So this is
 * deliberately plain, autosaves, and shows the note back the next time the
 * question comes round.
 */
export function NoteEditor({ questionId }: { questionId: string }) {
  const [text, setText] = useState('')
  const [saved, setSaved] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    let live = true
    setLoaded(false)
    void getNote(questionId).then((t) => {
      if (!live) return
      setText(t)
      setOpen(!!t)
      setLoaded(true)
      setSaved('idle')
    })
    return () => {
      live = false
      clearTimeout(timer.current)
    }
  }, [questionId])

  const onChange = (v: string) => {
    setText(v)
    setSaved('saving')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      void saveNote(questionId, v).then(() => setSaved('saved'))
    }, 600)
  }

  if (!loaded) return null

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="tap-press w-full rounded-lg border border-dashed border-line px-4 py-3 text-left text-[13px] text-muted hover:border-muted hover:text-white"
      >
        + Note what you learned, in your own words
      </button>
    )
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-muted">Your note</div>
        <div className="text-[11px] text-muted">
          {saved === 'saving' ? 'saving…' : saved === 'saved' ? 'saved' : ''}
        </div>
      </div>
      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => void saveNote(questionId, text)}
        rows={4}
        placeholder="What did you not know before? Put it in your own words — that is what makes it stick."
        /* 16px stops iOS zooming the viewport on focus. */
        className="mt-2 w-full resize-y rounded-lg border border-line bg-ink p-3 text-[16px] leading-relaxed text-[#e6edf3] outline-none placeholder:text-muted/60 focus:border-accent sm:text-[14px]"
      />
    </div>
  )
}

/** Shown before the answer, so a past note acts as a retrieval cue. */
export function NoteRecall({ questionId }: { questionId: string }) {
  const [text, setText] = useState('')
  useEffect(() => {
    let live = true
    void getNote(questionId).then((t) => live && setText(t))
    return () => {
      live = false
    }
  }, [questionId])

  if (!text) return null
  return (
    <details className="mt-4 rounded-lg border border-line bg-surface/60 px-4 py-3">
      <summary className="cursor-pointer list-none text-[12px] uppercase tracking-wider text-muted">
        Your earlier note ▸
      </summary>
      <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-[#c9d1d9]">{text}</p>
    </details>
  )
}
