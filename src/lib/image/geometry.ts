export interface PixelSize {
  width: number
  height: number
}

export function clampQuality(value: number): number {
  if (!Number.isFinite(value)) return 0.85
  return Math.min(1, Math.max(0.1, value))
}

export function fitDimensions(
  source: PixelSize,
  maxWidth: number | null,
  maxHeight: number | null,
  allowUpscale: boolean,
): PixelSize {
  const width = Math.max(1, Math.round(source.width))
  const height = Math.max(1, Math.round(source.height))
  const limitW = maxWidth && maxWidth > 0 ? Math.round(maxWidth) : null
  const limitH = maxHeight && maxHeight > 0 ? Math.round(maxHeight) : null
  if (!limitW && !limitH) return { width, height }

  let scale = Infinity
  if (limitW) scale = Math.min(scale, limitW / width)
  if (limitH) scale = Math.min(scale, limitH / height)
  if (!allowUpscale) scale = Math.min(scale, 1)

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}
