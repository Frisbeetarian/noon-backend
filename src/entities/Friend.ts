import { BaseEntity, PrimaryGeneratedColumn } from 'typeorm'

export class Friend extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid?: string

  username?: string
}
