export class ConversionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConversionError'
  }
}

export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ConversionError) return error.message
  if (error instanceof Error) {
    const message = error.message.trim()
    if (message && message.length < 180 && !message.includes('\n')) return message
  }
  return fallback
}
