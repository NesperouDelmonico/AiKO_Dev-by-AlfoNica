import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RegisterDeviceTokenDto {
  @ApiProperty({ description: 'Token FCM del dispositivo móvil' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  token!: string;
}
