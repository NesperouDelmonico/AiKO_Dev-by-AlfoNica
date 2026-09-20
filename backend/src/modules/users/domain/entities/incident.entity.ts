import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

export enum IncidentStatus {
  PENDIENTE = 'Pendiente',
  EN_PROCESO = 'En proceso',
  RESUELTA = 'Resuelta',
}

@Entity('incidencia')
export class IncidentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: UserEntity;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'enum', enum: IncidentStatus })
  estado: IncidentStatus;

  @CreateDateColumn({ type: 'timestamp' })
  fecha: Date;
}
