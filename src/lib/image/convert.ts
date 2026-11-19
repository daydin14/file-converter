import { toBlob } from '../bytes'
import { ConversionError } from '../errors'
import { LIMITS } from '../limits'
import { decodeBmp, encodeBmp } from './bmp'
import { clampQuality, fitDimensions } from './geometry'
import { decodeIco, encodeIco } from './ico'

export type OutputImageFormat = 'png' | 'jpeg' | 'webp' | 'avif' | 'bmp' | 'ico'

export interface ImageConvertOptions {
  format: OutputImageFormat
  quality: number
  maxWidth: number | null
  maxHeight: number | null
  allowUpscale: boolean
}

const mimeByFormat: Record<OutputImageFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
}

const imageExtensions = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'ico', 'avif'])

export function extensionForImage(format: OutputImageFormat): string {
  return format === 'jpeg' ? 'jpg' : format
}

export function imageMime(format: OutputImageFormat): string {
  return mimeByFormat[format]
}

export const imageAccept =
  '.png,.jpg,.jpeg,.webp,.gif,.bmp,.ico,.avif,image/png,image/jpeg,image/webp,image/gif,image/bmp,image/avif,image/x-icon,image/vnd.microsoft.icon'

export function isAcceptedImageName(name: string, type = ''): boolean {
  const extension = name.toLowerCase().split('.').pop() ?? ''
  if (imageExtensions.has(extension)) return true
  return type.startsWith('image/') && type !== 'image/svg+xml'
}

interface DecodedImage {
  source: CanvasImageSource
  width: number
  height: number
  cleanup: () => void
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new ConversionError('This browser could not encode that image. Try PNG or JPG.'))
          return
        }
        resolve(blob)
      },
      type,
      quality,
    )
  })
}

function bitmapFromPixels(bitmap: { width: number; height: number; rgba: Uint8ClampedArray }): DecodedImage {
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const context = canvas.getContext('2d')
  if (!context) throw new ConversionError('This browser could not draw the image.')
  const pixels = new Uint8ClampedArray(bitmap.rgba)
  context.putImageData(new ImageData(pixels, bitmap.width, bitmap.height), 0, 0)
  return { source: canvas, width: bitmap.width, height: bitmap.height, cleanup: () => undefined }
}

async function decodeBitmap(file: Blob): Promise<DecodedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  if (bitmap.width < 1 || bitmap.height < 1) {
    bitmap.close()
    throw new ConversionError('This image has no visible pixels.')
  }
  return {
    source: bitmap,
    width: bitmap.width,
    height: bitmap.height,
    cleanup: () => bitmap.close(),
  }
}

function isIco(header: Uint8Array): boolean {
  return header.length >= 4 && header[0] === 0 && header[1] === 0 && header[2] === 1 && header[3] === 0
}

function isBmp(header: Uint8Array): boolean {
  return header.length >= 2 && header[0] === 0x42 && header[1] === 0x4d
}

function isHeic(header: Uint8Array): boolean {
  if (header.length < 12) return false
  const brand = String.fromCharCode(header[8] ?? 0, header[9] ?? 0, header[10] ?? 0, header[11] ?? 0)
  return brand === 'heic' || brand === 'heif' || brand === 'mif1' || brand === 'avif'
}

async function decodeImage(file: Blob): Promise<DecodedImage> {
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  if (isHeic(header) && !isIco(header) && !isBmp(header)) {
    const brand = String.fromCharCode(header[8] ?? 0, header[9] ?? 0, header[10] ?? 0, header[11] ?? 0)
    if (brand !== 'avif') {
      throw new ConversionError('HEIC photos are not supported in the browser. Export a JPG or PNG and try again.')
    }
  }
  if (isIco(header)) {
    const decoded = decodeIco(new Uint8Array(await file.arrayBuffer()))
    if (decoded.kind === 'png') return decodeBitmap(toBlob(decoded.bytes, 'image/png'))
    return bitmapFromPixels(decoded.bitmap)
  }
  if (isBmp(header)) return bitmapFromPixels(decodeBmp(new Uint8Array(await file.arrayBuffer())))
  try {
    return await decodeBitmap(file)
  } catch (error) {
    if (error instanceof ConversionError) throw error
    throw new ConversionError('This image could not be read. Use PNG, JPG, WebP, GIF, AVIF, BMP, or ICO.')
  }
}

export async function browserSupportsAvifEncode(): Promise<boolean> {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  try {
    const blob = await canvasToBlob(canvas, 'image/avif', 0.8)
    return blob.type === 'image/avif'
  } catch {
    return false
  }
}

export async function convertImageFile(file: Blob, options: ImageConvertOptions): Promise<Blob> {
  const decoded = await decodeImage(file)
  try {
    let size = fitDimensions(decoded, options.maxWidth, options.maxHeight, options.allowUpscale)
    if (options.format === 'ico') {
      const scale = Math.min(1, 256 / Math.max(size.width, size.height))
      size = {
        width: Math.max(1, Math.round(size.width * scale)),
        height: Math.max(1, Math.round(size.height * scale)),
      }
    }
    if (size.width > LIMITS.maxCanvasEdge || size.height > LIMITS.maxCanvasEdge) {
      throw new ConversionError(
        `This would be ${size.width}×${size.height}. Set a max width or height of ${LIMITS.maxCanvasEdge} pixels or less.`,
      )
    }

    const canvas = document.createElement('canvas')
    canvas.width = size.width
    canvas.height = size.height
    const context = canvas.getContext('2d', { alpha: true })
    if (!context) throw new ConversionError('This browser could not create a canvas for the image.')
    const flatten = options.format === 'jpeg' || options.format === 'bmp'
    if (flatten) {
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, size.width, size.height)
    }
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(decoded.source, 0, 0, size.width, size.height)

    if (options.format === 'bmp') {
      const pixels = context.getImageData(0, 0, size.width, size.height)
      return toBlob(encodeBmp(pixels.data, size.width, size.height), mimeByFormat.bmp)
    }

    const quality = clampQuality(options.quality)
    const encoded = await canvasToBlob(canvas, options.format === 'ico' ? 'image/png' : mimeByFormat[options.format], quality)
    if (options.format === 'avif' && encoded.type !== 'image/avif') {
      throw new ConversionError('This browser cannot encode AVIF. Choose PNG, JPG, or WebP instead.')
    }
    if (options.format === 'ico') {
      const pngBytes = new Uint8Array(await encoded.arrayBuffer())
      return toBlob(encodeIco(pngBytes, size.width, size.height), mimeByFormat.ico)
    }
    return encoded
  } finally {
    decoded.cleanup()
  }
}
