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

const decimalNumberTransformer = {
  to: (value: number): number => value,
  from: (value: string | number): number => Number(value),
};

@Entity('paciente')
@Check('CHK_e019cc22cbe7d01a88af4da089', `"nivel_actual" > 0`)
@Check('CHK_30d9fafabfcb6d85ffb52f27de', `"xp_total" >= 0`)
@Check(
  'CHK_1e53693d2614875653aca0f91b',
  `"umbral_bajo_rendimiento" BETWEEN 0 AND 100`,
)
@Check('CHK_d9f690cd9683c5e6ac0ac8b89a', `"umbral_dias_inactividad" > 0`)
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
    transformer: decimalNumberTransformer,
  })
  umbralBajoRendimiento: number;

  @Column({ type: 'int', name: 'umbral_dias_inactividad' })
  umbralDiasInactividad: number;

  @Column({ type: 'date', name: 'fecha_asignacion' })
  fechaAsignacion: Date;
}
