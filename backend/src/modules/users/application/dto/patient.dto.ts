import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  Validate,
  ValidateIf,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';
import { isValidBirthDate } from '../patient-birth-date';

@ValidatorConstraint({ name: 'validBirthDate', async: false })
class ValidBirthDateConstraint implements ValidatorConstraintInterface {
  validate(value: unknown) {
    return isValidBirthDate(value);
  }

  defaultMessage() {
    return 'fecha_nacimiento debe ser una fecha ISO válida, no futura y de máximo 120 años';
  }
}

export class CreatePatientDto {
  @ApiProperty({ maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre!: string;

  @ApiProperty({ maxLength: 20 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  cedula!: string;

  @ApiProperty({ format: 'email' })
  @IsEmail()
  correo!: string;

  @ApiProperty({ type: 'string', format: 'date' })
  @IsString()
  @IsDateString({ strict: true })
  @Validate(ValidBirthDateConstraint)
  fecha_nacimiento!: string;

  @ApiProperty({ minimum: 0, maximum: 100 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  umbral_bajo_rendimiento!: number;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  umbral_dias_inactividad!: number;
}

export class UpdatePatientDto {
  @ApiPropertyOptional({ type: 'string', format: 'date' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsDateString({ strict: true })
  @Validate(ValidBirthDateConstraint)
  fecha_nacimiento?: string;
}

export class PatientResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() usuario_id!: string;
  @ApiProperty() especialista_id!: string;
  @ApiProperty() nombre!: string;
  @ApiProperty() correo!: string;
  @ApiProperty() cedula!: string;
  @ApiProperty() estado!: boolean;
  @ApiProperty({ type: 'string', format: 'date', nullable: true })
  fecha_nacimiento!: string | null;
  @ApiProperty({ type: 'integer', nullable: true })
  edad!: number | null;
  @ApiProperty() xp_total!: number;
  @ApiProperty() nivel_actual!: number;
  @ApiProperty() umbral_bajo_rendimiento!: number;
  @ApiProperty() umbral_dias_inactividad!: number;
  @ApiProperty({ type: 'string', format: 'date' })
  fecha_asignacion!: Date;
  @ApiPropertyOptional()
  especialista_nombre?: string;
}

export class PatientRouteProgressResponseDto {
  @ApiProperty() ruta_id!: string;
  @ApiProperty() total!: number;
  @ApiProperty() completados!: number;
  @ApiProperty() porcentaje!: number;
}

export class ListedPatientResponseDto extends PatientResponseDto {
  @ApiProperty() alertas_activas!: number;
  @ApiProperty({ type: PatientRouteProgressResponseDto, nullable: true })
  progreso_ruta!: PatientRouteProgressResponseDto | null;
}

export class PatientsQueryDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;
}

export class SearchPatientsQueryDto extends PatientsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  estado?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  nivel?: number;
}

export class AssignPatientDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  especialista_id!: string;
}

export class PatientThresholdsDto {
  @ApiProperty({ minimum: 0, maximum: 100 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  umbral_bajo_rendimiento!: number;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  umbral_dias_inactividad!: number;
}
