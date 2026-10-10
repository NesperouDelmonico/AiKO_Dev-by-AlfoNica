import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthUseCase } from '../../application/use-cases/auth.use-case';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  ResetPasswordDto,
} from '../../application/dto/auth.dto';
import { CurrentAuthUser, Public } from './auth.decorators';
import { Throttle } from '@nestjs/throttler';
@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly useCase: AuthUseCase) {}
  @Post('login')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión', security: [] })
  @ApiResponse({ status: 200, description: 'Login exitoso' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  @ApiResponse({ status: 423, description: 'Cuenta bloqueada' })
  @ApiResponse({ status: 429, description: 'Límite de cinco solicitudes por minuto' })
  login(@Body() dto: LoginDto) {
    return this.useCase.executeLogin(dto.correo, dto.contraseña);
  }
  @Post('logout')
  @ApiBearerAuth('bearerAuth')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@CurrentAuthUser() user: { jti: string; exp: number }) {
    return this.useCase.executeLogout(user.jti, user.exp);
  }
  @Get('me') @ApiBearerAuth('bearerAuth') me(
    @CurrentAuthUser() user: { sub: string },
  ) {
    return this.useCase.executeMe(user.sub);
  }

  @Patch('contrasena')
  @ApiBearerAuth('bearerAuth')
  @HttpCode(HttpStatus.NO_CONTENT)
  changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentAuthUser() user: { sub: string },
  ) {
    return this.useCase.changePassword(
      user.sub,
      dto.contraseña_actual,
      dto.nueva_contraseña,
    );
  }

  @Post('olvide-contrasena')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Solicitar restablecimiento de contraseña',
    security: [],
  })
  @ApiResponse({ status: 429, description: 'Límite de cinco solicitudes por minuto' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.useCase.requestPasswordReset(dto.correo);
  }

  @Post('restablecer-contrasena')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Restablecer contraseña con código', security: [] })
  @ApiResponse({ status: 429, description: 'Límite de cinco solicitudes por minuto' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.useCase.resetPassword(
      dto.correo,
      dto.codigo,
      dto.nueva_contraseña,
    );
  }
}
