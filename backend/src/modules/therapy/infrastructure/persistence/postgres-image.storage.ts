import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ImageEntity } from '../../domain/entities/image.entity';
import type {
  ImageStoragePort,
  StoredImage,
} from '../../domain/ports/image-storage.port';

@Injectable()
export class PostgresImageStorage implements ImageStoragePort {
  constructor(
    @InjectRepository(ImageEntity)
    private readonly images: Repository<ImageEntity>,
  ) {}

  async save(
    data: Buffer,
    tipoMime: string,
    userId: string,
  ): Promise<StoredImage> {
    const saved = await this.images.save(
      this.images.create({
        datos: data,
        tipoMime,
        tamano: data.length,
        usuario: { id: userId },
      }),
    );
    return { id: saved.id, tipoMime: saved.tipoMime, tamano: saved.tamano };
  }

  async read(id: string) {
    const image = await this.images.findOne({
      where: { id },
      select: { id: true, tipoMime: true, datos: true },
    });
    return image ? { tipoMime: image.tipoMime, datos: image.datos } : null;
  }

  async missing(ids: string[]) {
    if (!ids.length) return [];
    const found = await this.images.find({
      where: { id: In(ids) },
      select: { id: true },
    });
    const existing = new Set(found.map((image) => image.id));
    return ids.filter((id) => !existing.has(id));
  }
}
