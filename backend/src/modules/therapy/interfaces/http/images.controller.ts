import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import {
  CurrentAuthUser,
  Public,
  Roles,
} from '../../../auth/interfaces/http/auth.decorators';
import { UserRole } from '../../../users/domain/entities/user.entity';
import { UploadImageDto } from '../../application/dto/therapy.dto';
import { ImagesUseCase } from '../../application/use-cases/images.use-case';

@ApiTags('Imágenes')
@Controller('imagenes')
export class ImagesController {
  constructor(private readonly images: ImagesUseCase) {}

  @Post()
  @ApiBearerAuth('bearerAuth')
  @Roles(UserRole.ESPECIALISTA, UserRole.ADMINISTRADOR)
  upload(
    @Body() body: UploadImageDto,
    @CurrentAuthUser() user: { sub: string },
  ) {
    return this.images.upload(body.tipo_mime, body.datos, user.sub);
  }

  /**
   * Pública (id no adivinable) para que <img> de la web y Image.network de
   * la app la carguen sin cabecera Authorization. No contiene datos del
   * paciente: son imágenes de ejercicios que sube el especialista.
   */
  @Get(':id')
  @Public()
  async read(@Param('id') id: string, @Res() res: Response) {
    const image = await this.images.read(id);
    res.setHeader('Content-Type', image.tipoMime);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    // helmet pone same-origin; la web (otro dominio) necesita cargarla.
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.send(image.datos);
  }
}
