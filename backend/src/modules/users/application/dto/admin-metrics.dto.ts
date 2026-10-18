import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class TrendsQueryDto {
  @ApiProperty({ enum: ['semanal', 'mensual'] })
  @IsIn(['semanal', 'mensual'])
  periodo!: 'semanal' | 'mensual';
}
