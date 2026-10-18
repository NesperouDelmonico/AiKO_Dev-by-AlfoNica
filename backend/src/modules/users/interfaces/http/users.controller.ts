import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UsersUseCase } from '../../application/use-cases/users.use-case';
import {
  CurrentAuthUser,
  Public,
  Roles,
} from '../../../auth/interfaces/http/auth.decorators';
import { UserRole } from '../../domain/entities/user.entity';
import { Throttle } from '@nestjs/throttler';
import {
  AccountDto,
  InitialAdministratorDto,
  UpdateUserDto,
  UserStateDto,
  UsersQueryDto,
} from '../../application/dto/users.dto';
@ApiTags('Usuarios')
@ApiBearerAuth('bearerAuth')
@Controller('usuarios')
export class UsersController {
  constructor(private readonly useCase: UsersUseCase) {}
  @Get()
  @Roles(UserRole.ADMINISTRADOR)
  list(@Query() query: UsersQueryDto) {
    return this.useCase.executeList(query);
  }
  @Get(':id')
  @Roles(UserRole.ADMINISTRADOR)
  get(@Param('id') id: string) {
    return this.useCase.executeGet(id);
  }
  @Put(':id')
  @Roles(UserRole.ADMINISTRADOR)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.useCase.executeUpdate(id, dto);
  }
  @Patch(':id/estado')
  @Roles(UserRole.ADMINISTRADOR)
  state(
    @Param('id') id: string,
    @Body() dto: UserStateDto,
    @CurrentAuthUser() actor: { sub: string },
  ) {
    return this.useCase.executeState(id, dto.estado, actor.sub);
  }
  @Post('administrador-inicial')
  @Public()
  @ApiOperation({ summary: 'Registrar administrador inicial', security: [] })
  @ApiResponse({ status: 201, description: 'Administrador creado' })
  @ApiResponse({ status: 409, description: 'Ya existe un administrador' })
  initial(@Body() dto: InitialAdministratorDto) {
    return this.useCase.executeInitialAdministrator(dto);
  }
  @Post('administradores')
  @Roles(UserRole.ADMINISTRADOR)
  administrator(@Body() dto: AccountDto) {
    return this.useCase.executeAdministrator(dto);
  }
  @Post('especialistas')
  @Roles(UserRole.ADMINISTRADOR)
  specialist(@Body() dto: AccountDto) {
    return this.useCase.executeSpecialist(dto);
  }
  @Post(':id/restablecer-contrasena')
  @Roles(UserRole.ADMINISTRADOR)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({ status: 204, description: 'Contraseña temporal enviada' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({ status: 503, description: 'No se pudo entregar el correo' })
  @ApiResponse({ status: 429, description: 'Límite de cinco solicitudes por minuto' })
  resetPassword(@Param('id') id: string) {
    return this.useCase.executeAdminPasswordReset(id);
  }
}
