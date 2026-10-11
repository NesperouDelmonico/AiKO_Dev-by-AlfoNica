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
import {
  CurrentAuthUser,
  Roles,
} from '../../../auth/interfaces/http/auth.decorators';
import { UserRole } from '../../../users/domain/entities/user.entity';
import { TrackingUseCase } from '../../application/use-cases/tracking.use-case';
import {
  AlertQueryDto,
  NotificationQueryDto,
  ObservationDto,
  ObservationQueryDto,
  PreferenceDto,
} from '../../application/dto/tracking.dto';
import { RegisterDeviceTokenDto } from '../../application/dto/device-token.dto';
@ApiBearerAuth('bearerAuth')
@Controller()
export class TrackingController {
  constructor(private readonly use: TrackingUseCase) {}
  @ApiTags('Observaciones clínicas')
  @Post('pacientes/:id/observaciones')
  @Roles(UserRole.ESPECIALISTA, UserRole.ADMINISTRADOR)
  createObservation(
    @Param('id') id: string,
    @Body() d: ObservationDto,
    @CurrentAuthUser() user: { sub: string },
  ) {
    return this.use.createObservation(id, user.sub, d);
  }
  @ApiTags('Observaciones clínicas')
  @Get('pacientes/:id/observaciones')
  @Roles(UserRole.ESPECIALISTA, UserRole.ADMINISTRADOR, UserRole.PACIENTE)
  observations(
    @Param('id') id: string,
    @Query() query: ObservationQueryDto,
    @CurrentAuthUser() user: { sub: string; rol: UserRole },
  ) {
    return this.use.observations(id, query.page, query.limit, user);
  }
  @ApiTags('Observaciones clínicas')
  @Put('observaciones/:id')
  @Roles(UserRole.ESPECIALISTA, UserRole.ADMINISTRADOR)
  updateObservation(
    @Param('id') id: string,
    @Body() d: ObservationDto,
    @CurrentAuthUser() user: { sub: string; rol: UserRole },
  ) {
    return this.use.updateObservation(id, d, user);
  }
  @ApiTags('Alertas')
  @Get('pacientes/:id/alertas')
  @Roles(UserRole.PACIENTE, UserRole.ESPECIALISTA, UserRole.ADMINISTRADOR)
  patientAlerts(
    @Param('id') id: string,
    @Query() q: AlertQueryDto,
    @CurrentAuthUser() user: { sub: string; rol: UserRole },
  ) {
    return this.use.alerts(id, q, user);
  }
  @ApiTags('Alertas')
  @Get('alertas')
  @Roles(UserRole.ESPECIALISTA, UserRole.ADMINISTRADOR)
  alerts(
    @Query() q: AlertQueryDto,
    @CurrentAuthUser() user: { sub: string; rol: UserRole },
  ) {
    return this.use.alerts(undefined, q, user);
  }
  @ApiTags('Notificaciones y preferencias')
  @Get('pacientes/:id/notificaciones')
  @Roles(UserRole.PACIENTE)
  notifications(
    @Param('id') id: string,
    @Query() q: NotificationQueryDto,
    @CurrentAuthUser() user: { sub: string; rol: UserRole },
  ) {
    return this.use.notifications(id, q, user);
  }
  @ApiTags('Notificaciones y preferencias')
  @Patch('notificaciones/:id/leida')
  @Roles(UserRole.PACIENTE)
  markRead(
    @Param('id') id: string,
    @CurrentAuthUser() user: { sub: string; rol: UserRole },
  ) {
    return this.use.markRead(id, user);
  }
  @ApiTags('Notificaciones y preferencias')
  @Get('pacientes/:id/preferencia-notificacion')
  @Roles(UserRole.PACIENTE)
  preference(
    @Param('id') id: string,
    @CurrentAuthUser() user: { sub: string; rol: UserRole },
  ) {
    return this.use.preference(id, user);
  }
  @ApiTags('Notificaciones y preferencias')
  @Put('pacientes/:id/preferencia-notificacion')
  @Roles(UserRole.PACIENTE)
  savePreference(
    @Param('id') id: string,
    @Body() d: PreferenceDto,
    @CurrentAuthUser() user: { sub: string; rol: UserRole },
  ) {
    return this.use.savePreference(id, d, user);
  }

  @ApiTags('Notificaciones y preferencias')
  @Post('pacientes/:id/dispositivos')
  @Roles(UserRole.PACIENTE)
  registerDevice(
    @Param('id') id: string,
    @Body() dto: RegisterDeviceTokenDto,
    @CurrentAuthUser() user: { sub: string; rol: UserRole },
  ) {
    return this.use.registerDevice(id, dto, user);
  }
}
