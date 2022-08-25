import {
  Entity,
  Column,
  ManyToOne,
  PrimaryGeneratedColumn,
  BaseEntity,
} from 'typeorm'
import { Conversation } from './Conversation'
import { Profile } from './Profile'
import { Field, ObjectType } from 'type-graphql'

@ObjectType()
@Entity('conversation_profile')
export class ConversationToProfile extends BaseEntity {
  constructor(conversation: Conversation, profile: Profile) {
    super()
    this.conversation = conversation
    this.profile = profile
  }

  @Field(() => String)
  @PrimaryGeneratedColumn()
  public uuid!: string

  @Field(() => String)
  @Column()
  public conversationUuid!: string

  @Field(() => String)
  @Column()
  public profileUuid!: string
  // @Column()
  // public order!: number
  @ManyToOne(
    () => Conversation,
    (conversation) => conversation.conversationToProfiles
  )
  public conversation!: Conversation

  @ManyToOne(() => Profile, (profile) => profile.conversationToProfiles)
  public profile!: Profile
}
