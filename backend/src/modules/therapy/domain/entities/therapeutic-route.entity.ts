import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { PatientEntity } from '../../../users/domain/entities/patient.entity';
import { RouteExerciseEntity } from './route-exercise.entity';

export enum RouteStatus {
  ACTIVA = 'Activa',
  HISTORICA = 'Histórica',
}

@Entity('ruta_terapeutica')
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

  @CreateDateColumn({ type: 'timestamp', name: 'fecha_creacion' })
  fechaCreacion!: Date;

  @OneToMany(() => RouteExerciseEntity, (re) => re.ruta)
  ejercicios!: RouteExerciseEntity[];
}
