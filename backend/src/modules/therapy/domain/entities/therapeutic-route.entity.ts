import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  Check,
  Index,
} from 'typeorm';
import { PatientEntity } from '../../../users/domain/entities/patient.entity';
import { RouteExerciseEntity } from './route-exercise.entity';

export enum RouteStatus {
  ACTIVA = 'Activa',
  HISTORICA = 'Histórica',
}

@Entity('ruta_terapeutica')
@Check(
  'CHK_ruta_duracion_dias',
  `"duracion_dias" IS NULL OR "duracion_dias" BETWEEN 1 AND 31`,
)
@Index('UQ_ruta_activa_por_paciente', ['paciente'], {
  unique: true,
  where: `"estado" = 'Activa'`,
})
export class TherapeuticRouteEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => PatientEntity, {
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'paciente_id' })
  paciente!: PatientEntity;

  @Column({ type: 'enum', enum: RouteStatus })
  estado!: RouteStatus;

  /** Periodo del plan: 1 (un día), 7 (semana), 15 (quincena) o 30 (mes). */
  @Column({ type: 'int', name: 'duracion_dias', nullable: true })
  duracionDias!: number | null;

  @CreateDateColumn({ type: 'timestamp', name: 'fecha_creacion' })
  fechaCreacion!: Date;

  @OneToMany(() => RouteExerciseEntity, (re) => re.ruta)
  ejercicios!: RouteExerciseEntity[];
}
