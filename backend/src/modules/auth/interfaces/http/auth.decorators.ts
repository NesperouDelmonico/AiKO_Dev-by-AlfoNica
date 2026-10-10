import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { UserRole } from '../../../users/domain/entities/user.entity';

export const IS_PUBLIC_ROUTE = 'isPublicRoute';
export const REQUIRED_ROLES = 'requiredRoles';

export const Public = () => SetMetadata(IS_PUBLIC_ROUTE, true);
export const Roles = (...roles: UserRole[]) =>
  SetMetadata(REQUIRED_ROLES, roles);

export const CurrentAuthUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest().user,
);
