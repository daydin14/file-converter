import type { ReactNode } from 'react'

export function Field({
  id,
  label,
  hint,
  children,
}: {
  id?: string
  label: string
  hint?: string
  children: ReactNode
}) {
  const hintId = id && hint ? `${id}-hint` : undefined
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <div aria-describedby={hintId}>{children}</div>
      {hint ? (
        <p id={hintId} className="text-xs leading-5 text-base-content/70">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
