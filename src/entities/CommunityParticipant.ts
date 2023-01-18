import {
  BaseEntity,
  Column,
  Entity,
  ManyToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { Community } from './Community'
import { Profile } from './Profile'
import { Field, Int, ObjectType } from 'type-graphql'

@ObjectType()
@Entity()
export class CommunityParticipant extends BaseEntity {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id!: number

  @Field()
  @PrimaryColumn()
  profileId: number

  // @Field()
  @ManyToOne(() => Profile, (profile) => profile.communities)
  profile: Profile

  @Field()
  @PrimaryColumn()
  communityId: number

  // @Field()
  @ManyToOne(() => Community, (community) => community.participants)
  community: Community

  @Field()
  @Column()
  public participantUsername!: string
}
