import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { IMAGE_STORAGE } from '../../domain/ports/image-storage.port';
import type { ImageStoragePort } from '../../domain/ports/image-storage.port';

export const MAX_IMAGE_BYTES = 1_500_000;

const SIGNATURES: Record<string, (data: Buffer) => boolean> = {
  'image/png': (d) =>
    d.length > 8 &&
    d.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  'image/jpeg': (d) =>
    d.length > 3 && d[0] === 0xff && d[1] === 0xd8 && d[2] === 0xff,
};

@Injectable()
export class ImagesUseCase {
  constructor(
    @Inject(IMAGE_STORAGE) private readonly storage: ImageStoragePort,
  ) {}

  async upload(tipoMime: string, base64: string, userId: string) {
    const check = SIGNATURES[tipoMime];
    if (!check) {
      throw new BadRequestException('Solo se permiten imágenes PNG o JPG');
    }
    const clean = base64.replace(/^data:[^;]+;base64,/, '');
    if (!/^[A-Za-z0-9+/=\s]+$/.test(clean)) {
      throw new BadRequestException('"datos" debe estar en base64');
    }
    const data = Buffer.from(clean, 'base64');
    if (data.length > MAX_IMAGE_BYTES) {
      throw new PayloadTooLargeException(
        'La imagen supera 1,5 MB; redúcela e inténtalo de nuevo',
      );
    }
    // El contenido debe coincidir con el formato declarado.
    if (!check(data)) {
      throw new BadRequestException(
        'El archivo no es una imagen PNG o JPG válida',
      );
    }
    const saved = await this.storage.save(data, tipoMime, userId);
    return {
      id: saved.id,
      tipo_mime: saved.tipoMime,
      tamano: saved.tamano,
      url: `/v1/imagenes/${saved.id}`,
    };
  }

  async read(id: string) {
    const image = /^[0-9a-f-]{36}$/i.test(id)
      ? await this.storage.read(id)
      : null;
    if (!image) throw new NotFoundException('Imagen no encontrada');
    return image;
  }
}
