import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('sesion_revocada')
export class RevokedTokenEntity {
  @PrimaryColumn({ name: 'token_id', type: 'varchar', length: 36 })
  tokenId!: string;

  @Column({ type: 'timestamptz', name: 'expira_en' })
  expiresAt!: Date;
}
