import type { ReactNode } from 'react'

export function Bar({ value, color = 'var(--color-accent)' }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-raised">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.round(value * 100)}%`, background: color }}
      />
    </div>
  )
}

export function Pill({ children, tone = 'muted' }: { children: ReactNode; tone?: string }) {
  return (
    <span
      className="rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide"
      style={{ borderColor: `${tone}44`, color: tone, background: `${tone}14` }}
    >
      {children}
    </span>
  )
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-3 sm:p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums sm:text-2xl">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  )
}
