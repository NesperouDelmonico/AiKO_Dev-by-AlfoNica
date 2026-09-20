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
@ApiTags('Incidencias')
@ApiBearerAuth('bearerAuth')
@Controller('incidencias')
export class IncidentController {
  constructor(private readonly use: IncidentUseCase) {}
  @Post() create(@Body() d: CreateIncidentDto) {
    return this.use.create(d);
  }
  @Get() list(@Query() q: IncidentQueryDto) {
    return this.use.list(q.estado);
  }
  @Get(':id') get(@Param('id') id: string) {
    return this.use.get(id);
  }
  @Patch(':id/estado') status(
    @Param('id') id: string,
    @Body() d: IncidentStatusDto,
  ) {
    return this.use.status(id, d.estado);
  }
}
