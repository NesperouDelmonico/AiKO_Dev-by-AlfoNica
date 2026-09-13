import { randomUUID } from 'crypto';
import { Usuario } from '../domain/entities/usuario.entity';
import { Paciente } from '../domain/entities/paciente.entity';
import { UsuarioRepositoryPort } from '../domain/ports/usuario.repository.port';

export interface PasswordHasherPort {
  generarTemporal(): { passwordPlano: string; hash: string };
}

export interface EmailPort {
  enviarCredenciales(destinatario: string, nombre: string, passwordTemporal: string): Promise<void>;
}

export interface CrearPacienteInput {
  nombre: string;
  cedula: string; 
  email: string;
  especialistaId: string;
}

export class CrearPacienteUseCase {
  constructor(
    private readonly usuarioRepo: UsuarioRepositoryPort,
    private readonly hasher: PasswordHasherPort,
    private readonly emailAdapter: EmailPort,
  ) {}

  async ejecutar(input: CrearPacienteInput): Promise<{ pacienteId: string }> {
    // HUE-001.2, criterio 2: cédula/email duplicados se rechazan.
    // Con la superentidad Usuario, esta validación cubre los 3 roles a la vez.
    const existentePorCedula = await this.usuarioRepo.buscarUsuarioPorCedula(input.cedula);
    if (existentePorCedula) {
      throw new Error('Ya existe un usuario registrado con esta cédula.');
    }
    const existentePorEmail = await this.usuarioRepo.buscarUsuarioPorEmail(input.email);
    if (existentePorEmail) {
      throw new Error('Ya existe un usuario registrado con este correo.');
    }

    const { passwordPlano, hash } = this.hasher.generarTemporal();

    const usuario = Usuario.crear({
      id: randomUUID(),
      nombre: input.nombre,
      cedula: input.cedula,
      email: input.email,
      passwordHash: hash,
      fechaCreacion: new Date(),
    });

    const paciente = Paciente.crear({
      id: randomUUID(),
      usuarioId: usuario.id,
      especialistaId: input.especialistaId,
    });

    // Nota de infraestructura (no se resuelve aquí, en el dominio):
    // guardar usuario + guardar paciente deben ir en una sola transacción
    // de base de datos. Si el correo ya existe a nivel de constraint UNIQUE
    // (condición de carrera), ninguna de las dos filas debe quedar creada.
    await this.usuarioRepo.guardarUsuario(usuario);
    await this.usuarioRepo.guardarPaciente(paciente);

    // Envío de credenciales: asíncrono, no bloquea la respuesta al especialista.
    this.emailAdapter
      .enviarCredenciales(usuario.email, usuario.nombre, passwordPlano)
      .catch((err) => {
        // En infraestructura real: log + reintento. Aquí solo se documenta la intención.
        console.error('Fallo el envío de credenciales:', err);
      });

    return { pacienteId: paciente.id };
  }
}
