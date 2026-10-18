import { apiClient, requireResponse } from '../../api/client'

const MAX_SIDE = 1280
const MAX_BYTES = 1_400_000
const ACCEPTED = ['image/png', 'image/jpeg']

export class ImageUploadError extends Error {}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new ImageUploadError('No se pudo leer la imagen.'))
    reader.readAsDataURL(blob)
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new ImageUploadError('No se pudo procesar la imagen.'))), type, quality)
  })
}

/** Reduce la imagen a máx. 1280 px por lado y la deja bajo ~1,4 MB. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const context = canvas.getContext('2d')
  if (!context) throw new ImageUploadError('Tu navegador no permite procesar imágenes.')
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  if (file.type === 'image/png') {
    const png = await canvasToBlob(canvas, 'image/png')
    if (png.size <= MAX_BYTES) return png
  }
  for (const quality of [0.85, 0.7, 0.55]) {
    const jpeg = await canvasToBlob(canvas, 'image/jpeg', quality)
    if (jpeg.size <= MAX_BYTES) return jpeg
  }
  throw new ImageUploadError('La imagen es demasiado grande incluso reducida.')
}

/** Sube una imagen PNG/JPG al backend y devuelve su id. */
export async function uploadExerciseImage(file: File): Promise<string> {
  if (!ACCEPTED.includes(file.type)) throw new ImageUploadError('Solo se permiten imágenes PNG o JPG.')
  const blob = await shrink(file)
  const dataUrl = await readAsDataUrl(blob)
  const result = await apiClient.POST('/imagenes', {
    body: { tipo_mime: blob.type as 'image/png' | 'image/jpeg', datos: dataUrl.split(',')[1] ?? '' },
  })
  const image = await requireResponse(result.data, result.response)
  if (!image.id) throw new ImageUploadError('El servidor no devolvió la imagen.')
  return image.id
}
