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
  Min,
  ValidateNested,
} from 'class-validator';
import {
  CognitiveCategory,
  ExerciseStatus,
} from '../../domain/entities/exercise.entity';
export class CreateExerciseDto {
  @ApiProperty() @IsString() @IsNotEmpty() nombre!: string;
  @ApiProperty({ enum: CognitiveCategory })
  @IsEnum(CognitiveCategory)
  categoria!: CognitiveCategory;
  @ApiProperty() @IsInt() @Min(1) nivel_dificultad!: number;
  @ApiProperty() @IsString() @IsNotEmpty() instrucciones!: string;
  @ApiProperty() @IsObject() parametros!: Record<string, unknown>;
}
export class UpdateExerciseDto {
  @ApiPropertyOptional() @IsOptional() @IsString() nombre?: string;
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
  @ApiProperty() @IsInt() @Min(0) puntaje!: number;
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
