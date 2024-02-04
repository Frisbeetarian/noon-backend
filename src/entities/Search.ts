// @ts-nocheck
import {
  BaseEntity,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

export class Search extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid?: string

  username?: string

  name?: string

  userId?: string

  isAFriend: false

  hasFriendshipRequestFromLoggedInProfile: false

  hasSentFriendshipRequestToProfile: false

  @UpdateDateColumn()
  updatedAt: Date

  @CreateDateColumn()
  createdAt: Date
}
