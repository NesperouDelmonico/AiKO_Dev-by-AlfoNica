import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Check,
  Index,
} from 'typeorm';
import { TherapeuticRouteEntity } from './therapeutic-route.entity';
import { ExerciseEntity } from './exercise.entity';

export enum RouteExerciseStatus {
  PENDIENTE = 'Pendiente',
  COMPLETADO = 'Completado',
  REEMPLAZADO = 'Reemplazado',
}

@Entity('ruta_ejercicio')
@Check('CHK_58942faafae2e47edaa448b991', `"orden" > 0`)
@Index('UQ_ruta_orden_vigente', ['ruta', 'orden'], {
  unique: true,
  where: `"estado" <> 'Reemplazado'`,
})
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
