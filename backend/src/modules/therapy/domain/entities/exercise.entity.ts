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
  /** Retirado: ya no se pueden crear ejercicios de este tipo. */
  ATENCION_SOSTENIDA = 'atencion_sostenida',
  /** Secuencia de botones de colores (con sonido). */
  MEMORIA_SECUENCIAS = 'memoria_secuencias',
  /** Retirado: reemplazado por Toque de color. */
  REACCION = 'reaccion',
  COMPLETAR_PALABRAS = 'completar_palabras',
  RECORDAR_IMAGENES = 'recordar_imagenes',
  LOGICA = 'logica',
  TOQUE_COLOR = 'toque_color',
  BUSCA_IMAGEN = 'busca_imagen',
}

/** Juegos vigentes y la clasificación cognitiva a la que pertenece cada uno. */
export const CATEGORY_BY_GAME_TYPE: Partial<
  Record<GameType, CognitiveCategory>
> = {
  [GameType.COMPLETAR_PALABRAS]: CognitiveCategory.ATENCION,
  [GameType.LOGICA]: CognitiveCategory.ATENCION,
  [GameType.RECORDAR_IMAGENES]: CognitiveCategory.MEMORIA,
  [GameType.MEMORIA_SECUENCIAS]: CognitiveCategory.MEMORIA,
  [GameType.TOQUE_COLOR]: CognitiveCategory.VELOCIDAD,
  [GameType.BUSCA_IMAGEN]: CognitiveCategory.VELOCIDAD,
};

export const RETIRED_GAME_TYPES: GameType[] = [
  GameType.ATENCION_SOSTENIDA,
  GameType.REACCION,
];

/** Juego por defecto de cada clasificación cuando no se indica el tipo. */
export const DEFAULT_GAME_TYPE: Record<CognitiveCategory, GameType> = {
  [CognitiveCategory.ATENCION]: GameType.COMPLETAR_PALABRAS,
  [CognitiveCategory.MEMORIA]: GameType.RECORDAR_IMAGENES,
  [CognitiveCategory.VELOCIDAD]: GameType.TOQUE_COLOR,
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

  /** Visible en el taller para que otros especialistas lo importen. */
  @Column({ type: 'boolean', default: false })
  publicado!: boolean;

  @Column({ type: 'timestamp', name: 'fecha_publicacion', nullable: true })
  fechaPublicacion!: Date | null;

  /** Ejercicio del taller del que se importó esta copia. */
  @Column({ type: 'uuid', name: 'origen_id', nullable: true })
  origenId!: string | null;
}
