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

/** Mini-juego que ejecuta la app móvil (independiente de la categoría). */
export enum GameType {
  ATENCION_SOSTENIDA = 'atencion_sostenida',
  MEMORIA_SECUENCIAS = 'memoria_secuencias',
  REACCION = 'reaccion',
  COMPLETAR_PALABRAS = 'completar_palabras',
  RECORDAR_IMAGENES = 'recordar_imagenes',
  LOGICA = 'logica',
}

/** Tipo por defecto de los ejercicios creados antes de existir `tipo`. */
export const DEFAULT_GAME_TYPE: Record<CognitiveCategory, GameType> = {
  [CognitiveCategory.ATENCION]: GameType.ATENCION_SOSTENIDA,
  [CognitiveCategory.MEMORIA]: GameType.MEMORIA_SECUENCIAS,
  [CognitiveCategory.VELOCIDAD]: GameType.REACCION,
};

export enum ExerciseStatus {
  ACTIVO = 'Activo',
  DESACTIVADO = 'Desactivado',
}

@Entity('ejercicio')
@Check('CHK_5d6d4763858b1fa692483d956d', `"nivel_dificultad" > 0`)
export class ExerciseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 150 })
  nombre!: string;

  @Column({ type: 'enum', enum: CognitiveCategory })
  categoria!: CognitiveCategory;

  @Column({
    type: 'enum',
    enum: GameType,
  })
  tipo!: GameType;

  @Column({ type: 'text' })
  instrucciones!: string;

  @Column({ type: 'jsonb' })
  parametros!: Record<string, unknown>;

  @Column({ type: 'int', name: 'nivel_dificultad' })
  nivelDificultad!: number;

  @Column({ type: 'enum', enum: ExerciseStatus })
  estado!: ExerciseStatus;
  @ManyToOne(() => SpecialistEntity, {
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'especialista_id' })
  especialista!: SpecialistEntity;

  @CreateDateColumn({ type: 'timestamp', name: 'fecha_creacion' })
  fechaCreacion!: Date;

  /** Archivado: oculto en el catálogo; las rutas que ya lo usan siguen. */
  @Column({ type: 'timestamp', name: 'archivado_en', nullable: true })
  archivadoEn!: Date | null;
}
