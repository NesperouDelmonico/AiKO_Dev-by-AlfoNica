import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  Matches,
  IsString,
  MaxLength,
  Max,
  MinLength,
  Min,
} from 'class-validator';
import { UserRole } from '../../domain/entities/user.entity';
export class UsersQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  rol?: UserRole;
  @ApiPropertyOptional() @IsOptional() @IsString() q?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  estado?: boolean;
}
export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  nombre?: string;
  @ApiPropertyOptional({ maxLength: 150 })
  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  correo?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6,15}$/)
  cedula?: string;
}
export class UserStateDto {
  @ApiProperty() @IsBoolean() estado!: boolean;
}
export class AccountDto {
  @ApiProperty({ minLength: 3, maxLength: 100 })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  nombre!: string;
  @ApiProperty({ minLength: 6, maxLength: 15, pattern: '^\\d+$' })
  @IsString()
  @Matches(/^\d{6,15}$/)
  cedula!: string;
  @ApiProperty({ format: 'email', maxLength: 150 })
  @IsEmail()
  @MaxLength(150)
  correo!: string;
}
export class InitialAdministratorDto extends AccountDto {
  @ApiProperty({ format: 'password' })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Z])(?=.*\d).+$/)
  contraseña!: string;
}
