import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';
import { AlertStatus, AlertType } from '../../domain/entities/alert.entity';
export class ObservationDto {
  @ApiProperty() @IsString() @IsNotEmpty() texto!: string;
}
export class AlertQueryDto {
  @ApiPropertyOptional({ enum: AlertStatus })
  @IsOptional()
  @IsEnum(AlertStatus)
  estado?: AlertStatus;
  @ApiPropertyOptional({ enum: AlertType })
  @IsOptional()
  @IsEnum(AlertType)
  tipo?: AlertType;
  @ApiPropertyOptional() @IsOptional() @IsUUID() especialista_id?: string;
}
export class NotificationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  leida?: boolean;
}
export class PreferenceDto {
  @ApiProperty() @IsString() @IsNotEmpty() frecuencia!: string;
  @ApiProperty()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
  horario_recordatorio!: string;
}
