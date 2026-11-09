import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class PurchaseDto {
  @ApiProperty({ example: 'potenciador_xp' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  articulo_id!: string;
}

export class EquipDto {
  @ApiProperty({ example: 'gorra' })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  accesorio!: string;
}
