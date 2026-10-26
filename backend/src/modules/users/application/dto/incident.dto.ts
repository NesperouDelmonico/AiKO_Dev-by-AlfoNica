import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  Max,
  Min,
} from 'class-validator';
import { IncidentStatus } from '../../domain/entities/incident.entity';
export class CreateIncidentDto {
  @ApiProperty({ minLength: 10 })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  descripcion!: string;
}
export class IncidentQueryDto {
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

  @ApiPropertyOptional({ enum: IncidentStatus })
  @IsOptional()
  @IsEnum(IncidentStatus)
  estado?: IncidentStatus;
}
export class IncidentStatusDto {
  @ApiProperty({ enum: IncidentStatus })
  @IsEnum(IncidentStatus)
  estado!: IncidentStatus;
}
