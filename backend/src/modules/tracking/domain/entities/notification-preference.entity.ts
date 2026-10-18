import { Entity, OneToOne, JoinColumn, PrimaryColumn, Column } from 'typeorm';
import { PatientEntity } from '../../../users/domain/entities/patient.entity';

export enum ReminderFrequency {
  DIARIA = 'Diaria',
  SEMANAL = 'Semanal',
  NINGUNA = 'Ninguna',
}

@Entity('preferencia_notificacion')
export class NotificationPreferenceEntity {
  @PrimaryColumn({ name: 'paciente_id' })
  pacienteId!: string;

  @OneToOne(() => PatientEntity, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'paciente_id' })
  paciente!: PatientEntity;

  @Column({ type: 'varchar', length: 20 })
  frecuencia!: ReminderFrequency;

  @Column({ type: 'time', name: 'horario_recordatorio' })
  horarioRecordatorio!: string;
}
