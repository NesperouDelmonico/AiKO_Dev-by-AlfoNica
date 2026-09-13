import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  ManyToOne,
  JoinColumn,
  Check,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { SpecialistEntity } from './specialist.entity';

@Entity('paciente')
@Check(`"nivel_actual" > 0`)
@Check(`"xp_total" >= 0`)
@Check(`"umbral_bajo_rendimiento" BETWEEN 0 AND 100`)
@Check(`"umbral_dias_inactividad" > 0`)
export class PatientEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => UserEntity, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: UserEntity;

  @ManyToOne(() => SpecialistEntity, {
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'especialista_id' })
  especialista: SpecialistEntity;

  @Column({ type: 'int', default: 0, name: 'xp_total' })
  xpTotal: number;

  @Column({ type: 'int', default: 1, name: 'nivel_actual' })
  nivelActual: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    name: 'umbral_bajo_rendimiento',
  })
  umbralBajoRendimiento: number;

  @Column({ type: 'int', name: 'umbral_dias_inactividad' })
  umbralDiasInactividad: number;

  @Column({ type: 'date', name: 'fecha_asignacion' })
  fechaAsignacion: Date;
}
