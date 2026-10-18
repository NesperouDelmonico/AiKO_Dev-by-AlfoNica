import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from './modules/auth/interfaces/http/auth.decorators';

@ApiTags('Sistema')
@Controller()
export class AppController {
  @Get()
  @Public()
  @ApiOperation({ summary: 'Comprobar disponibilidad de la API' })
  @ApiResponse({ status: 200, description: 'API disponible' })
  health() {
    return {
      nombre: 'AiKO API',
      estado: 'ok',
      version: 'v1',
    };
  }
}
