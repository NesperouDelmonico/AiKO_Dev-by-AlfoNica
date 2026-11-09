import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentAuthUser,
  Roles,
} from '../../../auth/interfaces/http/auth.decorators';
import { UserRole } from '../../../users/domain/entities/user.entity';
import { GamificationUseCase } from '../../application/use-cases/gamification.use-case';
import { EquipDto, PurchaseDto } from './gamification.dto';

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

  @Get('tienda')
  @Roles(UserRole.PACIENTE, UserRole.ESPECIALISTA, UserRole.ADMINISTRADOR)
  shop() {
    return this.use.shop();
  }

  @Get('pacientes/:id/monedero')
  @Roles(UserRole.PACIENTE, UserRole.ESPECIALISTA, UserRole.ADMINISTRADOR)
  wallet(
    @Param('id') id: string,
    @CurrentAuthUser() user: { sub: string; rol: UserRole },
  ) {
    return this.use.wallet(id, user);
  }

  @Post('pacientes/:id/compras')
  @HttpCode(200)
  @Roles(UserRole.PACIENTE)
  purchase(
    @Param('id') id: string,
    @Body() body: PurchaseDto,
    @CurrentAuthUser() user: { sub: string; rol: UserRole },
  ) {
    return this.use.purchase(id, body.articulo_id, user);
  }

  @Put('pacientes/:id/accesorio')
  @Roles(UserRole.PACIENTE)
  equip(
    @Param('id') id: string,
    @Body() body: EquipDto,
    @CurrentAuthUser() user: { sub: string; rol: UserRole },
  ) {
    return this.use.equip(id, body.accesorio, user);
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
