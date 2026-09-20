import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TrackingUseCase } from '../../application/use-cases/tracking.use-case';
import {
  AlertQueryDto,
  NotificationQueryDto,
  ObservationDto,
  PreferenceDto,
} from '../../application/dto/tracking.dto';
@ApiBearerAuth('bearerAuth')
@Controller()
export class TrackingController {
  constructor(private readonly use: TrackingUseCase) {}
  @ApiTags('Observaciones clínicas')
  @Post('pacientes/:id/observaciones')
  createObservation(@Param('id') id: string, @Body() d: ObservationDto) {
    return this.use.createObservation(id, d);
  }
  @ApiTags('Observaciones clínicas')
  @Get('pacientes/:id/observaciones')
  observations(@Param('id') id: string) {
    return this.use.observations(id);
  }
  @ApiTags('Observaciones clínicas')
  @Put('observaciones/:id')
  updateObservation(@Param('id') id: string, @Body() d: ObservationDto) {
    return this.use.updateObservation(id, d.texto);
  }
  @ApiTags('Alertas') @Get('pacientes/:id/alertas') patientAlerts(
    @Param('id') id: string,
    @Query() q: AlertQueryDto,
  ) {
    return this.use.alerts(id, q);
  }
  @ApiTags('Alertas') @Get('alertas') alerts(@Query() q: AlertQueryDto) {
    return this.use.alerts(undefined, q);
  }
  @ApiTags('Notificaciones y preferencias')
  @Get('pacientes/:id/notificaciones')
  notifications(@Param('id') id: string, @Query() q: NotificationQueryDto) {
    return this.use.notifications(id, q);
  }
  @ApiTags('Notificaciones y preferencias')
  @Patch('notificaciones/:id/leida')
  markRead(@Param('id') id: string) {
    return this.use.markRead(id);
  }
  @ApiTags('Notificaciones y preferencias')
  @Get('pacientes/:id/preferencia-notificacion')
  preference(@Param('id') id: string) {
    return this.use.preference(id);
  }
  @ApiTags('Notificaciones y preferencias')
  @Put('pacientes/:id/preferencia-notificacion')
  savePreference(@Param('id') id: string, @Body() d: PreferenceDto) {
    return this.use.savePreference(id, d);
  }
}
