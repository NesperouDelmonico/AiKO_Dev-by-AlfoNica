/**
 * Entidad de dominio: Paciente
 *
 * Composición, no herencia: Paciente TIENE un usuarioId (referencia),
 * no "es un" Usuario. Todo lo relacionado con login/bloqueo vive en
 * Usuario; aquí solo vive lo que le pertenece conceptualmente al
 * paciente: XP, nivel, umbrales de alerta (por-paciente, ver RN-006).
 */

export interface PacienteProps {
  id: string;
  usuarioId: string;
  especialistaId: string;
  xpTotal: number;
  nivelActual: number;
  umbralBajoRendimiento: number;
  umbralDiasInactividad: number;
}

const XP_POR_NIVEL = 100; // regla simple para el MVP; ajustable sin tocar el resto del dominio

export class Paciente {
  private constructor(private props: PacienteProps) {}

  static crear(props: {
    id: string;
    usuarioId: string;
    especialistaId: string;
    umbralBajoRendimiento?: number;
    umbralDiasInactividad?: number;
  }): Paciente {
    return new Paciente({
      id: props.id,
      usuarioId: props.usuarioId,
      especialistaId: props.especialistaId,
      xpTotal: 0,
      nivelActual: 1,
      // Valores por defecto razonables; el especialista los puede ajustar luego (RN-006).
      umbralBajoRendimiento: props.umbralBajoRendimiento ?? 60,
      umbralDiasInactividad: props.umbralDiasInactividad ?? 3, // RN-005
    });
  }

  static reconstruir(props: PacienteProps): Paciente {
    return new Paciente(props);
  }

  get id(): string {
    return this.props.id;
  }

  get usuarioId(): string {
    return this.props.usuarioId;
  }

  get especialistaId(): string {
    return this.props.especialistaId;
  }

  get xpTotal(): number {
    return this.props.xpTotal;
  }

  get nivelActual(): number {
    return this.props.nivelActual;
  }

  get umbralBajoRendimiento(): number {
    return this.props.umbralBajoRendimiento;
  }

  get umbralDiasInactividad(): number {
    return this.props.umbralDiasInactividad;
  }

  /** RN-009: XP proporcional a precisión y tiempo. El cálculo exacto vive en ResultadoEjercicio. */
  ganarXP(cantidad: number): { subioDeNivel: boolean; nivelActual: number } {
    if (cantidad <= 0) return { subioDeNivel: false, nivelActual: this.props.nivelActual };

    this.props.xpTotal += cantidad;
    const nivelCalculado = Math.floor(this.props.xpTotal / XP_POR_NIVEL) + 1;
    const subioDeNivel = nivelCalculado > this.props.nivelActual;
    this.props.nivelActual = nivelCalculado;

    return { subioDeNivel, nivelActual: this.props.nivelActual };
  }

  /** Configurado por el especialista (RN-006), específico para este paciente. */
  actualizarUmbrales(umbralBajoRendimiento: number, umbralDiasInactividad: number): void {
    this.props.umbralBajoRendimiento = umbralBajoRendimiento;
    this.props.umbralDiasInactividad = umbralDiasInactividad;
  }

  toProps(): Readonly<PacienteProps> {
    return { ...this.props };
  }
}
