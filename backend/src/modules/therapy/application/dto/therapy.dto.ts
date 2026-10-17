import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  MinLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  CognitiveCategory,
  ExerciseStatus,
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
export class CreateRouteDto {
  @ApiProperty({ type: [RouteItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RouteItemDto)
  ejercicios!: RouteItemDto[];
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
