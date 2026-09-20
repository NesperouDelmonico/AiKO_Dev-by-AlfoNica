import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { PatientEntity } from '../../../users/domain/entities/patient.entity';

export enum AlertType {
  BAJO_RENDIMIENTO = 'BajoRendimiento',
  INACTIVIDAD = 'Inactividad',
}

export enum AlertStatus {
  ACTIVA = 'Activa',
  RESUELTA = 'Resuelta',
}

@Entity('alerta')
export class AlertEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PatientEntity, {
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'paciente_id' })
  paciente: PatientEntity;

  @Column({ type: 'enum', enum: AlertType })
  tipo: AlertType;

  @Column({ type: 'enum', enum: AlertStatus })
  estado: AlertStatus;

  @CreateDateColumn({ type: 'timestamp', name: 'fecha_generada' })
  fechaGenerada: Date;
}
