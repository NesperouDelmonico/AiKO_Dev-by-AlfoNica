import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PASSWORD_POLICY_PATTERN } from '../../../shared/application/password-policy';
export class LoginDto {
  @ApiProperty({ format: 'email' }) @IsEmail() correo!: string;
  @ApiProperty({ format: 'password' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(72)
  contraseña!: string;
}

export class ChangePasswordDto {
  @ApiProperty({ format: 'password', maxLength: 72 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(72)
  contraseña_actual!: string;

  @ApiProperty({ format: 'password', minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(PASSWORD_POLICY_PATTERN)
  nueva_contraseña!: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ format: 'email' })
  @IsEmail()
  correo!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ format: 'email', maxLength: 150 })
  @IsEmail()
  @MaxLength(150)
  correo!: string;

  @ApiProperty({ pattern: '^\\d{6}$' })
  @IsString()
  @Matches(/^\d{6}$/)
  codigo!: string;

  @ApiProperty({ format: 'password', minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(PASSWORD_POLICY_PATTERN)
  nueva_contraseña!: string;
}
