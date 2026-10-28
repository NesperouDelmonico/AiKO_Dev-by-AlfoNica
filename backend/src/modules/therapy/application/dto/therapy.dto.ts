import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  MinLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  CognitiveCategory,
  ExerciseStatus,
  GameType,
} from '../../domain/entities/exercise.entity';
import { RouteStatus } from '../../domain/entities/therapeutic-route.entity';
export class CreateExerciseDto {
  @ApiProperty({ minLength: 3, maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  nombre!: string;
  @ApiProperty({ enum: CognitiveCategory })
  @IsEnum(CognitiveCategory)
  categoria!: CognitiveCategory;
  @ApiPropertyOptional({
    enum: GameType,
    description: 'Mini-juego; por defecto se deduce de la categoría',
  })
  @IsOptional()
  @IsEnum(GameType)
  tipo?: GameType;
  @ApiProperty() @IsInt() @Min(1) nivel_dificultad!: number;
  @ApiProperty() @IsString() @IsNotEmpty() instrucciones!: string;
  @ApiProperty() @IsObject() parametros!: Record<string, unknown>;
}
export class UpdateExerciseDto {
  @ApiPropertyOptional({ minLength: 3, maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  nombre?: string;
  @ApiPropertyOptional({ enum: CognitiveCategory })
  @IsOptional()
  @IsEnum(CognitiveCategory)
  categoria?: CognitiveCategory;
  @ApiPropertyOptional({ enum: GameType })
  @IsOptional()
  @IsEnum(GameType)
  tipo?: GameType;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  nivel_dificultad?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() instrucciones?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() parametros?: Record<
    string,
    unknown
  >;
}
export class ExerciseStatusDto {
  @ApiProperty({ enum: ExerciseStatus })
  @IsEnum(ExerciseStatus)
  estado!: ExerciseStatus;
}
export class RouteItemDto {
  @ApiProperty() @IsUUID() ejercicio_id!: string;
  @ApiProperty() @IsInt() @Min(1) orden!: number;
  @ApiPropertyOptional({
    minimum: 1,
    description:
      'Día del plan. En una ruta nueva empieza en 1 y crece de a uno; al agregar, por defecto es el último día.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  dia?: number;
}
export const ROUTE_PERIODS = [1, 7, 15, 30] as const;
export class CreateRouteDto {
  @ApiProperty({ type: [RouteItemDto] })
  @IsArray()
  @ArrayMaxSize(300)
  @ValidateNested({ each: true })
  @Type(() => RouteItemDto)
  ejercicios!: RouteItemDto[];
  @ApiPropertyOptional({
    enum: ROUTE_PERIODS,
    description:
      'Periodo del plan en días (día, semana, quincena o mes); cada día debe tener ejercicios. Por defecto, el último día usado.',
  })
  @IsOptional()
  @IsIn(ROUTE_PERIODS)
  duracion_dias?: number;
}
export class UploadImageDto {
  @ApiProperty({ enum: ['image/png', 'image/jpeg'] })
  @IsIn(['image/png', 'image/jpeg'])
  tipo_mime!: string;
  @ApiProperty({ description: 'Contenido en base64 (máx. 1,5 MB)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2_100_000)
  datos!: string;
}
export class AddRouteExerciseDto extends RouteItemDto {}
export class ReplaceRouteExerciseDto {
  @ApiProperty() @IsUUID() nuevo_ejercicio_id!: string;
}
export class ResultDto {
  @ApiProperty({ minimum: 0, maximum: 100 })
  @IsInt()
  @Min(0)
  @Max(100)
  puntaje!: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) tiempo_reaccion_ms?:
    number | null;
  @ApiProperty() @IsInt() @Min(0) aciertos!: number;
}
export class ExerciseQueryDto {
  @ApiPropertyOptional({ enum: CognitiveCategory })
  @IsOptional()
  @IsEnum(CognitiveCategory)
  categoria?: CognitiveCategory;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  nivel_dificultad?: number;
  @ApiPropertyOptional({ enum: ExerciseStatus })
  @IsOptional()
  @IsEnum(ExerciseStatus)
  estado?: ExerciseStatus;
  @ApiPropertyOptional({
    description:
      'true: solo archivados. Por defecto se listan los ejercicios no archivados.',
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  archivados?: boolean;
}

export class ConsistencyQueryDto {
  @ApiPropertyOptional({ example: '2026-10', description: 'Mes YYYY-MM' })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'mes debe tener el formato YYYY-MM',
  })
  mes?: string;
}

export class ResultsQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

export class RoutesQueryDto extends ResultsQueryDto {
  @ApiPropertyOptional({ enum: RouteStatus })
  @IsOptional()
  @IsEnum(RouteStatus)
  estado?: RouteStatus;
}
