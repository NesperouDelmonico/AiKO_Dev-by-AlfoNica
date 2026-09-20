import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Sistema')
@Controller()
export class AppController {
  @Get()
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
