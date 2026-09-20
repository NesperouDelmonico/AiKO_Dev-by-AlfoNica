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
import { TherapyUseCase } from '../../application/use-cases/therapy.use-case';
import {
  AddRouteExerciseDto,
  CreateExerciseDto,
  CreateRouteDto,
  ExerciseQueryDto,
  ExerciseStatusDto,
  ReplaceRouteExerciseDto,
  ResultDto,
  UpdateExerciseDto,
} from '../../application/dto/therapy.dto';
@ApiTags('Ejercicios', 'Rutas terapéuticas', 'Ejecución y resultados')
@ApiBearerAuth('bearerAuth')
@Controller()
export class TherapyController {
  constructor(private readonly use: TherapyUseCase) {}
  @Get('ejercicios') list(@Query() q: ExerciseQueryDto) {
    return this.use.list(q);
  }
  @Post('ejercicios') create(@Body() d: CreateExerciseDto) {
    return this.use.create(d);
  }
  @Get('ejercicios/:id') get(@Param('id') id: string) {
    return this.use.get(id);
  }
  @Put('ejercicios/:id') update(
    @Param('id') id: string,
    @Body() d: UpdateExerciseDto,
  ) {
    return this.use.update(id, d);
  }
  @Patch('ejercicios/:id/estado') status(
    @Param('id') id: string,
    @Body() d: ExerciseStatusDto,
  ) {
    return this.use.status(id, d.estado);
  }
  @Post('ejercicios/:id/ejecutar') execute(@Param('id') id: string) {
    return this.use.execute(id);
  }
  @Post('pacientes/:id/rutas') route(
    @Param('id') id: string,
    @Body() d: CreateRouteDto,
  ) {
    return this.use.route(
      id,
      d.ejercicios.map((x) => ({
        ejercicioId: x.ejercicio_id,
        orden: x.orden,
      })),
    );
  }
  @Get('pacientes/:id/rutas/activa') active(@Param('id') id: string) {
    return this.use.activeRoute(id);
  }
  @Get('rutas/:id/progreso') progress(@Param('id') id: string) {
    return this.use.progress(id);
  }
  @Post('rutas/:id/ejercicios') add(
    @Param('id') id: string,
    @Body() d: AddRouteExerciseDto,
  ) {
    return this.use.add(id, d);
  }
  @Delete('rutas/:id/ejercicios/:rutaEjercicioId') remove(
    @Param('rutaEjercicioId') id: string,
  ) {
    return this.use.remove(id);
  }
  @Patch('rutas/:id/ejercicios/:rutaEjercicioId/reemplazar') replace(
    @Param('rutaEjercicioId') id: string,
    @Body() d: ReplaceRouteExerciseDto,
  ) {
    return this.use.replace(id, d.nuevo_ejercicio_id);
  }
  @Post('rutas/:rutaId/ejercicios/:rutaEjercicioId/resultados') result(
    @Param('rutaId') routeId: string,
    @Param('rutaEjercicioId') id: string,
    @Body() d: ResultDto,
  ) {
    return this.use.result(routeId, id, d);
  }
  @Get('pacientes/:id/resultados') results(@Param('id') id: string) {
    return this.use.results(id);
  }
  @Get('pacientes/:id/historial') history(@Param('id') id: string) {
    return this.use.results(id);
  }
  @Get('pacientes/:id/progreso/dominio') domain(
    @Param('id') id: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.use.domainProgress(id, desde, hasta);
  }
  @Get('pacientes/:id/progreso/temporal') temporal(
    @Param('id') id: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.use.temporalProgress(id, desde, hasta);
  }
}
