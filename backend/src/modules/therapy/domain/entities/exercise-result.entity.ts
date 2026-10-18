import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Check,
} from 'typeorm';
import { PatientEntity } from '../../../users/domain/entities/patient.entity';
import { RouteExerciseEntity } from './route-exercise.entity';

@Entity('resultado_ejercicio')
@Check('CHK_38f9ade169e6788e78d30b88d9', `"puntaje" >= 0`)
@Check('CHK_4586403825bcfd4d570b5d1770', `"aciertos" >= 0`)
@Check('CHK_7b65927ec504428b2561318821', `"xp_ganado" >= 0`)
@Check(
  'CHK_ecebbd5f76ec48988bfc705a0e',
  `"tiempo_reaccion_ms" IS NULL OR "tiempo_reaccion_ms" >= 0`,
)
export class ExerciseResultEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => PatientEntity, {
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'paciente_id' })
  paciente!: PatientEntity;

  @ManyToOne(() => RouteExerciseEntity, {
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'ruta_ejercicio_id' })
  rutaEjercicio!: RouteExerciseEntity;

  @Column({ type: 'int' })
  puntaje!: number;

  @Column({ type: 'int', nullable: true, name: 'tiempo_reaccion_ms' })
  tiempoReaccionMs!: number | null;

  @Column({ type: 'int' })
  aciertos!: number;

  @Column({ type: 'int', name: 'xp_ganado' })
  xpGanado!: number;

  @CreateDateColumn({ type: 'timestamp' })
  fecha!: Date;
}
