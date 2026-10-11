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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentAuthUser,
  Roles,
} from '../../../auth/interfaces/http/auth.decorators';
import { UserRole } from '../../domain/entities/user.entity';
import {
  AssignPatientDto,
  CreatePatientDto,
  PatientThresholdsDto,
  PatientsQueryDto,
  SearchPatientsQueryDto,
} from '../../application/dto/patient.dto';
import { PatientUseCase } from '../../application/use-cases/patient.use-case';

@ApiTags('Pacientes')
@ApiBearerAuth('bearerAuth')
@Controller('pacientes')
export class PatientController {
  constructor(private readonly useCase: PatientUseCase) {}

  @Post()
  @Roles(UserRole.ESPECIALISTA)
  @ApiOperation({ summary: 'Crear paciente asignado al especialista' })
  @ApiResponse({ status: 201, description: 'Paciente creado' })
  create(
    @Body() dto: CreatePatientDto,
    @CurrentAuthUser() user: { sub: string },
  ) {
    return this.useCase.create(dto, user.sub);
  }

  @Get()
  @Roles(UserRole.ESPECIALISTA)
  @ApiOperation({ summary: 'Listar pacientes asignados al especialista' })
  @ApiResponse({ status: 200, description: 'Lista paginada de pacientes' })
  list(
    @Query() query: PatientsQueryDto,
    @CurrentAuthUser() user: { sub: string },
  ) {
    return this.useCase.listAssigned(query, user.sub);
  }

  @Get('buscar')
  @Roles(UserRole.ESPECIALISTA, UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Buscar y filtrar pacientes' })
  @ApiResponse({ status: 200, description: 'Pacientes filtrados' })
  search(
    @Query() query: SearchPatientsQueryDto,
    @CurrentAuthUser() user: { sub: string; rol: UserRole },
  ) {
    return this.useCase.search(query, user);
  }

  @Get(':id')
  @Roles(UserRole.ESPECIALISTA, UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Consultar información básica del paciente' })
  @ApiResponse({ status: 200, description: 'Paciente encontrado' })
  @ApiResponse({ status: 404, description: 'Paciente no encontrado' })
  get(
    @Param('id') id: string,
    @CurrentAuthUser() user: { sub: string; rol: UserRole },
  ) {
    return this.useCase.get(id, user);
  }

  @Patch(':id/asignacion')
  @Roles(UserRole.ESPECIALISTA, UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Asignar paciente a un especialista' })
  @ApiResponse({ status: 200, description: 'Paciente reasignado' })
  assign(
    @Param('id') id: string,
    @Body() dto: AssignPatientDto,
    @CurrentAuthUser() user: { sub: string; rol: UserRole },
  ) {
    return this.useCase.assign(id, dto, user);
  }

  @Put(':id/umbrales')
  @Roles(UserRole.ESPECIALISTA, UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Configurar umbrales del paciente' })
  @ApiResponse({ status: 200, description: 'Umbrales actualizados' })
  thresholds(
    @Param('id') id: string,
    @Body() dto: PatientThresholdsDto,
    @CurrentAuthUser() user: { sub: string; rol: UserRole },
  ) {
    return this.useCase.thresholds(id, dto, user);
  }
}
