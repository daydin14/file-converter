export function ToolHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <header className="max-w-3xl">
      <p className="text-sm font-semibold tracking-[0.16em] text-primary uppercase">{eyebrow}</p>
      <h1 className="mt-2 font-display text-4xl tracking-tight text-balance sm:text-5xl">{title}</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-base-content/80">{description}</p>
    </header>
  )
}
