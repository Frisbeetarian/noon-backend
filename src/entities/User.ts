import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { Profile } from './Profile'

@Entity()
export class User extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid!: string

  @Column({ unique: true })
  username!: string

  @Column({ unique: true, nullable: true })
  email!: string

  @Column()
  password!: string

  @Column({ type: 'text', nullable: true })
  publicKey?: string

  @Column({ type: 'text', nullable: true })
  encryptedPrivateKey?: string

  @Column({ nullable: true })
  profileId?: string

  @Column({ nullable: true })
  profileUuid?: string

  @OneToOne(() => Profile, (profile) => profile.user, {
    cascade: true,
    nullable: true,
  })
  @JoinColumn()
  profile: Profile

  @UpdateDateColumn()
  updatedAt: Date

  @CreateDateColumn()
  createdAt: Date
}
