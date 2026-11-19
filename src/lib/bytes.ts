export function copyBytes(bytes: Uint8Array): Uint8Array {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy
}

export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = copyBytes(bytes)
  return copy.buffer as ArrayBuffer
}

export function toBlob(bytes: Uint8Array, type: string): Blob {
  return new Blob([toArrayBuffer(bytes)], { type })
}

export function encodeText(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

export function decodeText(bytes: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes).replace(/^\uFEFF/, '')
}
