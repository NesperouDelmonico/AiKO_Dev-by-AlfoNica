import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { PatientEntity } from '../../../users/domain/entities/patient.entity';

@Entity('token_dispositivo')
export class DeviceTokenEntity {
  @PrimaryColumn({ type: 'varchar', length: 4096, name: 'token_fcm' })
  token!: string;

  @ManyToOne(() => PatientEntity, {
    nullable: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'paciente_id',
    foreignKeyConstraintName: 'FK_token_dispositivo_paciente',
  })
  paciente!: PatientEntity;

  @Column({
    type: 'timestamptz',
    name: 'fecha_registro',
    default: () => 'now()',
  })
  fechaRegistro!: Date;
}
