import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IncidentUseCase } from '../../application/use-cases/incident.use-case';
import {
  CreateIncidentDto,
  IncidentQueryDto,
  IncidentStatusDto,
} from '../../application/dto/incident.dto';
import {
  CurrentAuthUser,
  Roles,
} from '../../../auth/interfaces/http/auth.decorators';
import { UserRole } from '../../domain/entities/user.entity';
@ApiTags('Incidencias')
@ApiBearerAuth('bearerAuth')
@Controller('incidencias')
export class IncidentController {
  constructor(private readonly use: IncidentUseCase) {}
  @Post() create(
    @Body() d: CreateIncidentDto,
    @CurrentAuthUser() user: { sub: string },
  ) {
    return this.use.create(user.sub, d.descripcion);
  }
  @Get() @Roles(UserRole.ADMINISTRADOR) list(@Query() q: IncidentQueryDto) {
    return this.use.list(q);
  }
  @Get(':id') @Roles(UserRole.ADMINISTRADOR) get(@Param('id') id: string) {
    return this.use.get(id);
  }
  @Patch(':id/estado') @Roles(UserRole.ADMINISTRADOR) status(
    @Param('id') id: string,
    @Body() d: IncidentStatusDto,
  ) {
    return this.use.status(id, d.estado);
  }
}
