import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { AUTH_REPOSITORY } from '../../domain/ports/auth.repository.port';
import type { AuthRepositoryPort } from '../../domain/ports/auth.repository.port';
import { IS_PUBLIC_ROUTE } from './auth.decorators';

type AuthClaims = {
  sub: string;
  rol: string;
  jti: string;
  exp: number;
};

type AuthenticatedRequest = Request & { user?: AuthClaims };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    @Inject(AUTH_REPOSITORY)
    private readonly repository: AuthRepositoryPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_ROUTE,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Token bearer requerido');
    }

    let claims: AuthClaims;
    try {
      claims = await this.jwt.verifyAsync<AuthClaims>(token);
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    if (
      !claims.sub ||
      !claims.jti ||
      (await this.repository.isSessionRevoked(claims.jti))
    ) {
      throw new UnauthorizedException('Sesión revocada o inválida');
    }
    const user = await this.repository.findById(claims.sub);
    if (!user || !user.estado) {
      throw new UnauthorizedException('Cuenta inactiva o inexistente');
    }

    request.user = { ...claims, rol: user.rol };
    return true;
  }
}
