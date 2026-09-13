import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersUseCase } from '../../application/use-cases/users.use-case';
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
  @Get() list(@Query() query: UsersQueryDto) {
    return this.useCase.executeList(query);
  }
  @Get(':id') get(@Param('id') id: string) {
    return this.useCase.executeGet(id);
  }
  @Put(':id') update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.useCase.executeUpdate(id, dto);
  }
  @Patch(':id/estado') state(
    @Param('id') id: string,
    @Body() dto: UserStateDto,
  ) {
    return this.useCase.executeState(id, dto.estado);
  }
  @Post('administrador-inicial') @ApiBearerAuth() initial(
    @Body() dto: InitialAdministratorDto,
  ) {
    return this.useCase.executeInitialAdministrator(dto);
  }
  @Post('administradores') administrator(@Body() dto: AccountDto) {
    return this.useCase.executeAdministrator(dto);
  }
  @Post('especialistas') specialist(@Body() dto: AccountDto) {
    return this.useCase.executeSpecialist(dto);
  }
}
