import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GamificationUseCase } from '../../application/use-cases/gamification.use-case';
@ApiTags('Gamificación')
@ApiBearerAuth('bearerAuth')
@Controller()
export class GamificationController {
  constructor(private readonly use: GamificationUseCase) {}
  @Get('pacientes/:id/perfil-logros') profile(@Param('id') id: string) {
    return this.use.profile(id);
  }
  @Get('insignias') badges() {
    return this.use.badges();
  }
  @Get('pacientes/:id/insignias') patient(@Param('id') id: string) {
    return this.use.patientBadges(id);
  }
  @Get('pacientes/:id/contenido-desbloqueado') unlocked(
    @Param('id') id: string,
  ) {
    return this.use.unlocked(id);
  }
}
