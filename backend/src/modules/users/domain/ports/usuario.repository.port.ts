import { Usuario } from '../entities/usuario.entity';
import { Paciente } from '../entities/paciente.entity';
import { Especialista } from '../entities/especialista.entity';
import { Administrador } from '../entities/administrador.entity';

/**
 * Puerto de salida (interfaz). El dominio depende de esto, nunca de
 * TypeORM directamente. La implementación real vive en
 * infrastructure/usuario.typeorm.repository.ts
 */
export interface UsuarioRepositoryPort {
  buscarUsuarioPorCedula(cedula: string): Promise<Usuario | null>;
  buscarUsuarioPorEmail(email: string): Promise<Usuario | null>;
  buscarUsuarioPorId(id: string): Promise<Usuario | null>;
  guardarUsuario(usuario: Usuario): Promise<void>;

  buscarPacientePorUsuarioId(usuarioId: string): Promise<Paciente | null>;
  buscarPacientesPorEspecialista(especialistaId: string): Promise<Paciente[]>;
  guardarPaciente(paciente: Paciente): Promise<void>;

  buscarEspecialistaPorUsuarioId(usuarioId: string): Promise<Especialista | null>;
  guardarEspecialista(especialista: Especialista): Promise<void>;

  buscarAdministradorPorUsuarioId(usuarioId: string): Promise<Administrador | null>;
  guardarAdministrador(administrador: Administrador): Promise<void>;
  existeAlgunAdministrador(): Promise<boolean>; // soporta RF-074 (cuenta cero)
}
