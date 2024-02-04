// @ts-nocheck
import { BaseEntity, PrimaryGeneratedColumn } from 'typeorm'

export class FriendshipRequest extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid?: string

  username?: string

  reverse?: Boolean
}
