import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('insignia')
export class BadgeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'varchar' })
  condicion: string;
}
