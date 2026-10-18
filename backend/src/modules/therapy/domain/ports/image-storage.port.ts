export const IMAGE_STORAGE = Symbol('IMAGE_STORAGE');

export type StoredImage = { id: string; tipoMime: string; tamano: number };

/** Almacenamiento de imágenes de ejercicios (hoy Postgres; luego un bucket). */
export interface ImageStoragePort {
  save(data: Buffer, tipoMime: string, userId: string): Promise<StoredImage>;
  read(id: string): Promise<{ tipoMime: string; datos: Buffer } | null>;
  /** Devuelve los ids de la lista que no existen. */
  missing(ids: string[]): Promise<string[]>;
}
