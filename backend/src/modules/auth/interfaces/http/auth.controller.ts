import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUseCase } from '../../application/use-cases/auth.use-case';
import { LoginDto } from '../../application/dto/auth.dto';
@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly useCase: AuthUseCase) {}
  @Post('login') @HttpCode(HttpStatus.OK) login(@Body() dto: LoginDto) {
    return this.useCase.executeLogin(dto.correo, dto.contraseña);
  }
  @Post('logout')
  @ApiBearerAuth('bearerAuth')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout() {
    /* TODO: obtener identidad desde el guard de Auth. */ return this.useCase.executeLogout(
      'TODO-authenticated-user',
    );
  }
  @Get('me') @ApiBearerAuth('bearerAuth') me() {
    /* TODO: obtener identidad desde el guard de Auth. */ return this.useCase.executeMe(
      'TODO-authenticated-user',
    );
  }
}
