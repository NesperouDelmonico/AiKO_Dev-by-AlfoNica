import { ConflictException } from '@nestjs/common';

type PostgreSqlDriverError = {
  code?: string;
  constraint?: string;
  detail?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function mapUserUniqueViolation(error: unknown): void {
  if (!isRecord(error) || !isRecord(error.driverError)) return;
  const driverError = error.driverError as PostgreSqlDriverError;
  if (driverError.code !== '23505') return;

  const constraint = `${driverError.constraint ?? ''} ${driverError.detail ?? ''}`
    .toLowerCase();
  if (constraint.includes('correo')) {
    throw new ConflictException('Correo duplicado');
  }
  if (constraint.includes('cedula') || constraint.includes('cédula')) {
    throw new ConflictException('Cédula duplicada');
  }
}
