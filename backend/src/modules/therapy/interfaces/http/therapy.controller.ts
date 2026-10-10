import {
  Body,
  Controller,
  Delete,
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
import { TherapyUseCase } from '../../application/use-cases/therapy.use-case';
import {
  AddRouteExerciseDto,
  CreateExerciseDto,
  CreateRouteDto,
  ExerciseQueryDto,
  ExerciseStatusDto,
  ReplaceRouteExerciseDto,
  ResultDto,
  ResultsQueryDto,
  UpdateExerciseDto,
} from '../../application/dto/therapy.dto';
@ApiTags('Ejercicios', 'Rutas terapéuticas', 'Ejecución y resultados')
@ApiBearerAuth('bearerAuth')
@Controller()
export class TherapyController {
  constructor(private readonly use: TherapyUseCase) {}
  @Get('ejercicios') list(
    @Query() q: ExerciseQueryDto,
    @CurrentAuthUser() user: { sub: string; rol: UserRole },
  ) {
    return this.use.list(q, user);
  }
  @Post('ejercicios')
  @Roles(UserRole.ESPECIALISTA, UserRole.ADMINISTRADOR)
  create(
    @Body() d: CreateExerciseDto,
    @CurrentAuthUser() user: { sub: string },
  ) {
    return this.use.create(d, user.sub);
  }
  @Get('ejercicios/:id') get(@Param('id') id: string) {
    return this.use.get(id);
  }
  @Put('ejercicios/:id')
  @Roles(UserRole.ESPECIALISTA, UserRole.ADMINISTRADOR)
  update(
    @Param('id') id: string,
    @Body() d: UpdateExerciseDto,
    @CurrentAuthUser() user: { sub: string; rol: UserRole },
  ) {
    return this.use.update(id, d, user);
  }
  @Patch('ejercicios/:id/estado')
  @Roles(UserRole.ESPECIALISTA, UserRole.ADMINISTRADOR)
  status(
    @Param('id') id: string,
    @Body() d: ExerciseStatusDto,
    @CurrentAuthUser() user: { sub: string; rol: UserRole },
  ) {
    return this.use.status(id, d, user);
  }
  @Post('ejercicios/:id/ejecutar') @Roles(UserRole.PACIENTE) execute(
    @Param('id') id: string,
    @CurrentAuthUser() user: { sub: string },
  ) {
    return this.use.execute(id, user.sub);
  }
  @Post('pacientes/:id/rutas')
  @Roles(UserRole.ESPECIALISTA, UserRole.ADMINISTRADOR)
  route(
    @Param('id') id: string,
    @Body() d: CreateRouteDto,
    @CurrentAuthUser() user: { sub: string },
  ) {
    return this.use.route(
      id,
      d.ejercicios.map((x) => ({
        ejercicioId: x.ejercicio_id,
        orden: x.orden,
      })),
      user.sub,
    );
  }
  @Get('pacientes/:id/rutas/activa')
  @Roles(UserRole.PACIENTE, UserRole.ESPECIALISTA, UserRole.ADMINISTRADOR)
  active(
    @Param('id') id: string,
    @CurrentAuthUser() user: { sub: string; rol: UserRole },
  ) {
    return this.use.activeRoute(id, user);
  }
  @Get('rutas/:id/progreso')
  @Roles(UserRole.PACIENTE, UserRole.ESPECIALISTA, UserRole.ADMINISTRADOR)
  progress(
    @Param('id') id: string,
    @CurrentAuthUser() user: { sub: string; rol: UserRole },
  ) {
    return this.use.progress(id, user);
  }
  @Post('rutas/:id/ejercicios')
  @Roles(UserRole.ESPECIALISTA, UserRole.ADMINISTRADOR)
  add(
    @Param('id') id: string,
    @Body() d: AddRouteExerciseDto,
    @CurrentAuthUser() user: { sub: string; rol: UserRole },
  ) {
    return this.use.add(id, d, user);
  }
  @Delete('rutas/:id/ejercicios/:rutaEjercicioId')
  @Roles(UserRole.ESPECIALISTA, UserRole.ADMINISTRADOR)
  remove(
    @Param('id') routeId: string,
    @Param('rutaEjercicioId') id: string,
    @CurrentAuthUser() user: { sub: string; rol: UserRole },
  ) {
    return this.use.remove(routeId, id, user);
  }
  @Patch('rutas/:id/ejercicios/:rutaEjercicioId/reemplazar')
  @Roles(UserRole.ESPECIALISTA, UserRole.ADMINISTRADOR)
  replace(
    @Param('id') routeId: string,
    @Param('rutaEjercicioId') id: string,
    @Body() d: ReplaceRouteExerciseDto,
    @CurrentAuthUser() user: { sub: string; rol: UserRole },
  ) {
    return this.use.replace(routeId, id, d.nuevo_ejercicio_id, user);
  }
  @Post('rutas/:rutaId/ejercicios/:rutaEjercicioId/resultados')
  @Roles(UserRole.PACIENTE)
  result(
    @Param('rutaId') routeId: string,
    @Param('rutaEjercicioId') id: string,
    @Body() d: ResultDto,
    @CurrentAuthUser() user: { sub: string },
  ) {
    return this.use.result(routeId, id, d, user.sub);
  }
  @Get('pacientes/:id/resultados')
  @Roles(UserRole.PACIENTE, UserRole.ESPECIALISTA, UserRole.ADMINISTRADOR)
  results(
    @Param('id') id: string,
    @Query() query: ResultsQueryDto,
    @CurrentAuthUser() user: { sub: string; rol: UserRole },
  ) {
    return this.use.results(id, query.page, query.limit, user);
  }
  @Get('pacientes/:id/historial')
  @Roles(UserRole.PACIENTE, UserRole.ESPECIALISTA, UserRole.ADMINISTRADOR)
  history(
    @Param('id') id: string,
    @Query() query: ResultsQueryDto,
    @CurrentAuthUser() user: { sub: string; rol: UserRole },
  ) {
    return this.use.results(id, query.page, query.limit, user);
  }
  @Get('pacientes/:id/progreso/dominio')
  @Roles(UserRole.PACIENTE, UserRole.ESPECIALISTA, UserRole.ADMINISTRADOR)
  domain(
    @Param('id') id: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @CurrentAuthUser() user?: { sub: string; rol: UserRole },
  ) {
    return this.use.domainProgress(id, desde, hasta, user!);
  }
  @Get('pacientes/:id/progreso/temporal')
  @Roles(UserRole.PACIENTE, UserRole.ESPECIALISTA, UserRole.ADMINISTRADOR)
  temporal(
    @Param('id') id: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @CurrentAuthUser() user?: { sub: string; rol: UserRole },
  ) {
    return this.use.temporalProgress(id, desde, hasta, user!);
  }
}
