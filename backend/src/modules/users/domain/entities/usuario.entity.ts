/**
 * Entidad de dominio: Usuario
 *
 * Representa el núcleo compartido de autenticación entre los tres roles
 * (Paciente, Especialista, Administrador). Cubre RF-001 a RF-005.
 *
 * Decisión de diseño: Paciente/Especialista/Administrador NO heredan de
 * Usuario. Cada uno TIENE un usuarioId y compone una instancia de Usuario
 * cuando necesita autenticarse. Esto evita que Paciente cargue lógica de
 * autenticación que no le pertenece conceptualmente, y evita que el
 * sistema de tipos permita pasar un Paciente donde se espera un Usuario
 * genérico sin que tenga sentido de negocio.
 */

export type EstadoCuenta = 'activo' | 'inactivo';

export interface UsuarioProps {
  id: string;
  nombre: string;
  cedula: string;
  email: string;
  passwordHash: string;
  estado: EstadoCuenta;
  intentosFallidos: number;
  bloqueadoHasta: Date | null;
  fechaCreacion: Date;
}

const MAX_INTENTOS_FALLIDOS = 5; // RNF-002
const MINUTOS_BLOQUEO = 15; // RNF-002

export class Usuario {
  private constructor(private props: UsuarioProps) {}

  static crear(props: Omit<UsuarioProps, 'estado' | 'intentosFallidos' | 'bloqueadoHasta'>): Usuario {
    return new Usuario({
      ...props,
      estado: 'activo',
      intentosFallidos: 0,
      bloqueadoHasta: null,
    });
  }

  static reconstruir(props: UsuarioProps): Usuario {
    return new Usuario(props);
  }

  get id(): string {
    return this.props.id;
  }

  get nombre(): string {
    return this.props.nombre;
  }

  get cedula(): string {
    return this.props.cedula;
  }

  get email(): string {
    return this.props.email;
  }

  get estado(): EstadoCuenta {
    return this.props.estado;
  }

  /** Indica si la cuenta está temporalmente bloqueada por intentos fallidos (RNF-002). */
  estaBloqueado(ahora: Date = new Date()): boolean {
    return this.props.bloqueadoHasta !== null && this.props.bloqueadoHasta > ahora;
  }

  /**
   * Verifica la contraseña. NO calcula el hash aquí (eso es responsabilidad
   * de un puerto/adaptador de hashing en infraestructura) — recibe el
   * resultado de la comparación ya resuelto para mantener el dominio puro.
   */
  registrarIntentoFallido(): void {
    if (this.props.estado !== 'activo') return;
    this.props.intentosFallidos += 1;

    if (this.props.intentosFallidos >= MAX_INTENTOS_FALLIDOS) {
      const bloqueoHasta = new Date();
      bloqueoHasta.setMinutes(bloqueoHasta.getMinutes() + MINUTOS_BLOQUEO);
      this.props.bloqueadoHasta = bloqueoHasta;
    }
  }

  registrarIntentoExitoso(): void {
    this.props.intentosFallidos = 0;
    this.props.bloqueadoHasta = null;
  }

  activar(): void {
    this.props.estado = 'activo';
  }

  desactivar(): void {
    this.props.estado = 'inactivo';
    // Nota: desactivar preserva el historial (RN-010) — no elimina la fila.
  }

  toProps(): Readonly<UsuarioProps> {
    return { ...this.props };
  }
}
