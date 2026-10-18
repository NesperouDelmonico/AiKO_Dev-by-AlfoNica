import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentAuthUser,
  Roles,
} from '../../../auth/interfaces/http/auth.decorators';
import { UserRole } from '../../../users/domain/entities/user.entity';
import { GamificationUseCase } from '../../application/use-cases/gamification.use-case';

@ApiTags('Gamificación')
@ApiBearerAuth('bearerAuth')
@Controller()
export class GamificationController {
  constructor(private readonly use: GamificationUseCase) {}

  @Get('pacientes/:id/perfil-logros')
  @Roles(UserRole.PACIENTE, UserRole.ESPECIALISTA, UserRole.ADMINISTRADOR)
  profile(
    @Param('id') id: string,
    @CurrentAuthUser() user: { sub: string; rol: UserRole },
  ) {
    return this.use.profile(id, user);
  }

  @Get('insignias')
  badges() {
    return this.use.badges();
  }

  @Get('pacientes/:id/insignias')
  @Roles(UserRole.PACIENTE, UserRole.ESPECIALISTA, UserRole.ADMINISTRADOR)
  patient(
    @Param('id') id: string,
    @CurrentAuthUser() user: { sub: string; rol: UserRole },
  ) {
    return this.use.patientBadges(id, user);
  }

  @Get('pacientes/:id/contenido-desbloqueado')
  @Roles(UserRole.PACIENTE, UserRole.ESPECIALISTA, UserRole.ADMINISTRADOR)
  unlocked(
    @Param('id') id: string,
    @CurrentAuthUser() user: { sub: string; rol: UserRole },
  ) {
    return this.use.unlocked(id, user);
  }
}
