import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
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
  @ApiPropertyOptional() @IsOptional() @IsString() rol?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  estado?: boolean;
}
export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nombre?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() correo?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  cedula?: string;
}
export class UserStateDto {
  @ApiProperty() @IsBoolean() estado!: boolean;
}
export class AccountDto {
  @ApiProperty() @IsString() @IsNotEmpty() nombre!: string;
  @ApiProperty() @IsString() @IsNotEmpty() cedula!: string;
  @ApiProperty() @IsEmail() correo!: string;
}
export class InitialAdministratorDto extends AccountDto {
  @ApiProperty({ format: 'password' })
  @IsString()
  @IsNotEmpty()
  contraseña!: string;
}
