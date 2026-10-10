import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthUseCase } from '../../application/use-cases/auth.use-case';
import { LoginDto } from '../../application/dto/auth.dto';
import { CurrentAuthUser, Public } from './auth.decorators';
@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly useCase: AuthUseCase) {}
  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión', security: [] })
  @ApiResponse({ status: 200, description: 'Login exitoso' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  @ApiResponse({ status: 423, description: 'Cuenta bloqueada' })
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
}
