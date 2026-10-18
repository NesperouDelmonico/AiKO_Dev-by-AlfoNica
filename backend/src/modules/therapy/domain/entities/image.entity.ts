import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../../../users/domain/entities/user.entity';

/**
 * Imagen que un especialista sube para un ejercicio (referencia de
 * "Completar palabras" o "Lógica", tarjetas de "Recordar imágenes").
 * Se guarda en Postgres; ImageStoragePort permite moverla a un bucket.
 */
@Entity('imagen')
export class ImageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 20, name: 'tipo_mime' })
  tipoMime!: string;

  @Column({ type: 'bytea', select: false })
  datos!: Buffer;

  @Column({ type: 'int' })
  tamano!: number;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario!: UserEntity;

  @CreateDateColumn({ type: 'timestamp', name: 'fecha_creacion' })
  fechaCreacion!: Date;
}
