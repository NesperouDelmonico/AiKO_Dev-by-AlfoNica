/**
 * Entidad de dominio: Administrador
 *
 * Composición con Usuario. Sin lógica propia adicional por ahora
 * (sus casos de uso operan principalmente sobre Usuario y otras
 * entidades, no sobre atributos propios de Administrador).
 */

export interface AdministradorProps {
  id: string;
  usuarioId: string;
}

export class Administrador {
  private constructor(private props: AdministradorProps) {}

  static crear(props: AdministradorProps): Administrador {
    return new Administrador(props);
  }

  static reconstruir(props: AdministradorProps): Administrador {
    return new Administrador(props);
  }

  get id(): string {
    return this.props.id;
  }

  get usuarioId(): string {
    return this.props.usuarioId;
  }

  toProps(): Readonly<AdministradorProps> {
    return { ...this.props };
  }
}
