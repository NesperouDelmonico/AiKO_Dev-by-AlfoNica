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
  ApiExtraModels,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
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
  PatientResponseDto,
  ListedPatientResponseDto,
  UpdatePatientDto,
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
  @ApiResponse({
    status: 201,
    description: 'Paciente creado',
    type: PatientResponseDto,
  })
  @ApiResponse({ status: 409, description: 'El correo o la cédula ya existen' })
  @ApiResponse({
    status: 503,
    description: 'No se pudo entregar el correo; la cuenta quedó inactiva',
  })
  create(
    @Body() dto: CreatePatientDto,
    @CurrentAuthUser() user: { sub: string },
  ) {
    return this.useCase.create(dto, user.sub);
  }

  @Get()
  @Roles(UserRole.ESPECIALISTA)
  @ApiExtraModels(ListedPatientResponseDto)
  @ApiOperation({ summary: 'Listar pacientes asignados al especialista' })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de pacientes',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(ListedPatientResponseDto) },
        },
      },
    },
  })
  list(
    @Query() query: PatientsQueryDto,
    @CurrentAuthUser() user: { sub: string },
  ) {
    return this.useCase.listAssigned(query, user.sub);
  }

  @Get('buscar')
  @Roles(UserRole.ESPECIALISTA, UserRole.ADMINISTRADOR)
  @ApiExtraModels(ListedPatientResponseDto)
  @ApiOperation({ summary: 'Buscar y filtrar pacientes' })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de pacientes filtrados',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(ListedPatientResponseDto) },
        },
      },
    },
  })
  search(
    @Query() query: SearchPatientsQueryDto,
    @CurrentAuthUser() user: { sub: string; rol: UserRole },
  ) {
    return this.useCase.search(query, user);
  }

  @Get(':id')
  @Roles(UserRole.ESPECIALISTA, UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Consultar información básica del paciente' })
  @ApiResponse({
    status: 200,
    description: 'Paciente encontrado',
    type: PatientResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Paciente no encontrado' })
  @ApiResponse({ status: 403, description: 'Sin acceso al paciente' })
  get(
    @Param('id') id: string,
    @CurrentAuthUser() user: { sub: string; rol: UserRole },
  ) {
    return this.useCase.get(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.ESPECIALISTA, UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Actualizar la fecha de nacimiento del paciente' })
  @ApiResponse({
    status: 200,
    description: 'Paciente actualizado',
    type: PatientResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Cuerpo o fecha inválidos' })
  @ApiResponse({ status: 403, description: 'Sin acceso al paciente' })
  @ApiResponse({ status: 404, description: 'Paciente no encontrado' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePatientDto,
    @CurrentAuthUser() user: { sub: string; rol: UserRole },
  ) {
    return this.useCase.update(id, dto, user);
  }

  @Patch(':id/asignacion')
  @Roles(UserRole.ESPECIALISTA, UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Asignar paciente a un especialista' })
  @ApiResponse({
    status: 200,
    description: 'Paciente reasignado',
    type: PatientResponseDto,
  })
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
  @ApiResponse({
    status: 200,
    description: 'Umbrales actualizados',
    type: PatientResponseDto,
  })
  thresholds(
    @Param('id') id: string,
    @Body() dto: PatientThresholdsDto,
    @CurrentAuthUser() user: { sub: string; rol: UserRole },
  ) {
    return this.useCase.thresholds(id, dto, user);
  }
}
