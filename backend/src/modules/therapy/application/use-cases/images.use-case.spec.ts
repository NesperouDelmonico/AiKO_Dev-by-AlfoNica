import {
  BadRequestException,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ImagesUseCase, MAX_IMAGE_BYTES } from './images.use-case';

const PNG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13]);
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16]);

describe('ImagesUseCase', () => {
  const storage = {
    save: jest.fn(async (data: Buffer, tipoMime: string) => ({
      id: 'img-id',
      tipoMime,
      tamano: data.length,
    })),
    read: jest.fn(),
    missing: jest.fn(),
  };
  const useCase = new ImagesUseCase(storage);

  beforeEach(() => jest.clearAllMocks());

  it('guarda PNG y JPG (también con prefijo data:) y devuelve la URL', async () => {
    await expect(
      useCase.upload('image/png', PNG.toString('base64'), 'user'),
    ).resolves.toEqual({
      id: 'img-id',
      tipo_mime: 'image/png',
      tamano: PNG.length,
      url: '/v1/imagenes/img-id',
    });
    await useCase.upload(
      'image/jpeg',
      `data:image/jpeg;base64,${JPG.toString('base64')}`,
      'user',
    );
    expect(storage.save).toHaveBeenLastCalledWith(JPG, 'image/jpeg', 'user');
  });

  it('rechaza contenido que no coincide con el formato o es muy grande', async () => {
    await expect(
      useCase.upload('image/png', JPG.toString('base64'), 'user'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      useCase.upload('image/gif', PNG.toString('base64'), 'user'),
    ).rejects.toBeInstanceOf(BadRequestException);
    const big = Buffer.concat([PNG, Buffer.alloc(MAX_IMAGE_BYTES)]);
    await expect(
      useCase.upload('image/png', big.toString('base64'), 'user'),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('404 para ids inválidos o inexistentes', async () => {
    await expect(useCase.read('../etc')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    storage.read.mockResolvedValue(null);
    await expect(
      useCase.read('6b3f0f1e-6a4b-4c1e-9b2a-1d2e3f4a5b6c'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
