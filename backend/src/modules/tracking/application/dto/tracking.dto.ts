import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { AlertStatus, AlertType } from '../../domain/entities/alert.entity';
import { ReminderFrequency } from '../../domain/entities/notification-preference.entity';
export class ObservationDto {
  @ApiProperty({ minLength: 5 })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  texto!: string;
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
export class TrackingPageQueryDto {
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

export class ObservationQueryDto extends TrackingPageQueryDto {}

export class NotificationQueryDto extends TrackingPageQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  leida?: boolean;
}
export class PreferenceDto {
  @ApiProperty({ enum: ReminderFrequency })
  @IsEnum(ReminderFrequency)
  frecuencia!: ReminderFrequency;

  @ApiProperty()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const [hh, mm, ss] = value.split(':');
    if (ss !== undefined) return `${hh}:${mm}:${ss}`;
    return `${hh}:${mm}:00`;
  })
  horario_recordatorio!: string;
}
