import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
export class LoginDto {
  @ApiProperty({ format: 'email' }) @IsEmail() correo!: string;
  @ApiProperty({ format: 'password' })
  @IsString()
  @IsNotEmpty()
  contraseña!: string;
}
