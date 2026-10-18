import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

const MAX_DEPTH = 8;

const toSnake = (key: string) =>
  key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

/**
 * Agrega a cada clave camelCase de la respuesta su alias snake_case
 * (nivelDificultad → nivel_dificultad), sin quitar la original.
 *
 * El contrato OpenAPI y la web usan snake_case, pero varias entidades de
 * TypeORM se serializan tal cual en camelCase; la app móvil acepta ambas.
 */
export function withSnakeCaseAliases(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH || value === null || typeof value !== 'object') {
    return value;
  }
  if (value instanceof Date || Buffer.isBuffer(value)) return value;
  if (Array.isArray(value)) {
    return value.map((item) => withSnakeCaseAliases(item, depth + 1));
  }
  const output: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value)) {
    const converted = withSnakeCaseAliases(raw, depth + 1);
    output[key] = converted;
    if (/[A-Z]/.test(key)) {
      const alias = toSnake(key);
      if (!(alias in value)) output[alias] = converted;
    }
  }
  return output;
}

@Injectable()
export class SnakeCaseAliasInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(map((body) => withSnakeCaseAliases(body)));
  }
}
