import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IncidentStatus } from '../../domain/entities/incident.entity';
export class CreateIncidentDto {
  @ApiProperty() @IsString() @IsNotEmpty() descripcion!: string;
}
export class IncidentQueryDto {
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
