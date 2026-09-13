import {
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
  CreateDateColumn,
} from 'typeorm';
import { PatientEntity } from '../../../users/domain/entities/patient.entity';
import { BadgeEntity } from './badge.entity';

@Entity('paciente_insignia')
export class PatientBadgeEntity {
  @PrimaryColumn({ name: 'paciente_id' })
  pacienteId: string;

  @PrimaryColumn({ name: 'insignia_id' })
  insigniaId: string;

  @ManyToOne(() => PatientEntity, {
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'paciente_id' })
  paciente: PatientEntity;

  @ManyToOne(() => BadgeEntity, {
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'insignia_id' })
  insignia: BadgeEntity;

  @CreateDateColumn({ type: 'timestamp', name: 'fecha_obtenida' })
  fechaObtenida: Date;
}
