/**
 * Entidad de dominio: Especialista
 *
 * Composición con Usuario, igual que Paciente. Hoy casi no tiene lógica
 * propia más allá de identidad — y eso está bien: no hay que inventarle
 * comportamiento que no le corresponde solo para "llenar" la clase.
 */

export interface EspecialistaProps {
  id: string;
  usuarioId: string;
}

export class Especialista {
  private constructor(private props: EspecialistaProps) {}

  static crear(props: EspecialistaProps): Especialista {
    return new Especialista(props);
  }

  static reconstruir(props: EspecialistaProps): Especialista {
    return new Especialista(props);
  }

  get id(): string {
    return this.props.id;
  }

  get usuarioId(): string {
    return this.props.usuarioId;
  }

  toProps(): Readonly<EspecialistaProps> {
    return { ...this.props };
  }
}
