import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Check,
} from 'typeorm';
import { TherapeuticRouteEntity } from './therapeutic-route.entity';
import { ExerciseEntity } from './exercise.entity';

export enum RouteExerciseStatus {
  PENDIENTE = 'Pendiente',
  COMPLETADO = 'Completado',
  REEMPLAZADO = 'Reemplazado',
}

@Entity('ruta_ejercicio')
@Check(`"orden" > 0`)
export class RouteExerciseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => TherapeuticRouteEntity, {
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'ruta_id' })
  ruta: TherapeuticRouteEntity;

  @ManyToOne(() => ExerciseEntity, {
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'ejercicio_id' })
  ejercicio: ExerciseEntity;

  @Column({ type: 'int' })
  orden: number;

  @Column({ type: 'enum', enum: RouteExerciseStatus })
  estado: RouteExerciseStatus;
}
