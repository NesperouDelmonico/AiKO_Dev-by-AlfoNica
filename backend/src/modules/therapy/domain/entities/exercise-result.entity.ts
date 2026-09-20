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
@Check(`"puntaje" >= 0`)
@Check(`"aciertos" >= 0`)
@Check(`"xp_ganado" >= 0`)
@Check(`"tiempo_reaccion_ms" IS NULL OR "tiempo_reaccion_ms" >= 0`)
export class ExerciseResultEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PatientEntity, {
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'paciente_id' })
  paciente: PatientEntity;

  @ManyToOne(() => RouteExerciseEntity, {
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'ruta_ejercicio_id' })
  rutaEjercicio: RouteExerciseEntity;

  @Column({ type: 'int' })
  puntaje: number;

  @Column({ type: 'int', nullable: true, name: 'tiempo_reaccion_ms' })
  tiempoReaccionMs: number | null; 

  @Column({ type: 'int' })
  aciertos: number;

  @Column({ type: 'int', name: 'xp_ganado' })
  xpGanado: number;

  @CreateDateColumn({ type: 'timestamp' })
  fecha: Date;
}
