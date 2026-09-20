import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Check,
} from 'typeorm';

export enum UserRole {
  PACIENTE = 'Paciente',
  ESPECIALISTA = 'Especialista',
  ADMINISTRADOR = 'Administrador',
}

@Entity('usuario')
@Check(`"intentos_fallidos" >= 0`)
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  cedula: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  correo: string;

  @Column({ type: 'varchar', length: 255, name: 'contraseña_hash' })
  contraseñaHash: string;

  @Column({ type: 'enum', enum: UserRole })
  rol: UserRole;

  @Column({ type: 'boolean', default: true })
  estado: boolean;

  @Column({ type: 'int', default: 0, name: 'intentos_fallidos' })
  intentosFallidos: number;

  @CreateDateColumn({ type: 'timestamp', name: 'fecha_creacion' })
  fechaCreacion: Date;
}
