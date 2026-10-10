import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Check,
} from 'typeorm';
import { UserEntity } from '../../../users/domain/entities/user.entity';

@Entity('restablecimiento_contrasena')
@Index('UQ_restablecimiento_contrasena_usuario', ['usuario'], { unique: true })
@Check('CHK_restablecimiento_contrasena_intentos', '"intentos" BETWEEN 0 AND 5')
export class PasswordResetEntity {
  @PrimaryColumn({ name: 'token_hash', type: 'varchar', length: 64 })
  tokenHash!: string;

  @ManyToOne(() => UserEntity, {
    nullable: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'usuario_id',
    foreignKeyConstraintName: 'FK_restablecimiento_contrasena_usuario',
  })
  usuario!: UserEntity;

  @Column({ type: 'timestamptz', name: 'expira_en' })
  expiresAt!: Date;

  @Column({ type: 'int', default: 0, name: 'intentos' })
  attempts!: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'fecha_creacion' })
  fechaCreacion!: Date;
}
