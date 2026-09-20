import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { PatientEntity } from '../../../users/domain/entities/patient.entity';

export enum NotificationType {
  RECORDATORIO = 'Recordatorio',
  SUBIDA_NIVEL = 'SubidaNivel',
  INSIGNIA_OBTENIDA = 'InsigniaObtenida',
}

@Entity('notificacion')
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;


  @ManyToOne(() => PatientEntity, {
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'paciente_id' })
  paciente: PatientEntity;

  @Column({ type: 'enum', enum: NotificationType })
  tipo: NotificationType;

  @Column({ type: 'text' })
  mensaje: string;

  @Column({ type: 'boolean', default: false })
  leida: boolean;

  @CreateDateColumn({ type: 'timestamp', name: 'fecha_envio' })
  fechaEnvio: Date;
}
