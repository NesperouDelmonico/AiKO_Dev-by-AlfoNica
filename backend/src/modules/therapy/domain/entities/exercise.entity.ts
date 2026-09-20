import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Check,
} from 'typeorm';
import { SpecialistEntity } from '../../../users/domain/entities/specialist.entity';

export enum CognitiveCategory {
  ATENCION = 'Atención',
  MEMORIA = 'Memoria',
  VELOCIDAD = 'Velocidad',
}

export enum ExerciseStatus {
  ACTIVO = 'Activo',
  DESACTIVADO = 'Desactivado',
}

@Entity('ejercicio')
@Check(`"nivel_dificultad" > 0`)
export class ExerciseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ type: 'enum', enum: CognitiveCategory })
  categoria: CognitiveCategory; 

  @Column({ type: 'text' })
  instrucciones: string;

  @Column({ type: 'jsonb' })
  parametros: Record<string, unknown>;

  @Column({ type: 'int', name: 'nivel_dificultad' })
  nivelDificultad: number; 

  @Column({ type: 'enum', enum: ExerciseStatus })
  estado: ExerciseStatus; 
  @ManyToOne(() => SpecialistEntity, {
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'especialista_id' })
  especialista: SpecialistEntity;

  @CreateDateColumn({ type: 'timestamp', name: 'fecha_creacion' })
  fechaCreacion: Date;
}
