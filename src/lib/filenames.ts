const unsafeCharacters = /[^\w.\- ()[\]]+/g

export function baseName(name: string): string {
  const trimmed = name.trim().replace(/^.*[/\\]/, '')
  const cleaned = trimmed.replace(unsafeCharacters, '_').replace(/^\.+/, '')
  return cleaned || 'file'
}

export function replaceExtension(name: string, extension: string): string {
  const ext = extension.replace(/^\./, '').toLowerCase()
  const base = baseName(name).replace(/\.[^.]+$/, '')
  return `${base || 'file'}.${ext}`
}

export function extensionOf(name: string): string {
  const match = /\.([^.]+)$/.exec(baseName(name).toLowerCase())
  return match?.[1] ?? ''
}

export function uniqueName(name: string, used: Set<string>): string {
  const safe = baseName(name)
  if (!used.has(safe)) {
    used.add(safe)
    return safe
  }
  const match = /^(.*?)(\.[^.]+)?$/.exec(safe)
  const stem = match?.[1] || 'file'
  const ext = match?.[2] ?? ''
  let index = 2
  let candidate = `${stem} (${index})${ext}`
  while (used.has(candidate)) {
    index += 1
    candidate = `${stem} (${index})${ext}`
  }
  used.add(candidate)
  return candidate
}
