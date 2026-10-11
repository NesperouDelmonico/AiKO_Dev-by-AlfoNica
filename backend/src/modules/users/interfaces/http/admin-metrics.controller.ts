import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../auth/interfaces/http/auth.decorators';
import { UserRole } from '../../domain/entities/user.entity';
import { UsersUseCase } from '../../application/use-cases/users.use-case';
import { TrendsQueryDto } from '../../application/dto/admin-metrics.dto';

@ApiTags('Administración')
@ApiBearerAuth('bearerAuth')
@Roles(UserRole.ADMINISTRADOR)
@Controller('admin')
export class AdminMetricsController {
  constructor(private readonly users: UsersUseCase) {}

  @Get('indicadores')
  @ApiOperation({
    summary: 'Calcular indicadores generales del sistema (RF-068)',
  })
  indicators() {
    return this.users.executeIndicators();
  }

  @Get('tendencias')
  @ApiOperation({
    summary: 'Consultar tendencia semanal o mensual de uso (RF-069)',
  })
  trends(@Query() query: TrendsQueryDto) {
    return this.users.executeTrends(query.periodo);
  }
}
