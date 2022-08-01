import {
  BaseEntity,
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  // JoinColumn,
} from 'typeorm'
import { Event } from './Event'
import { Profile } from './Profile'
import { Field, ObjectType } from 'type-graphql'
// import { Field } from 'type-graphql'

@ObjectType()
@Entity()
export class EventToProfile extends BaseEntity {
  constructor(event: Event, profile: Profile, participantUsername: string) {
    super()
    this.event = event
    this.profile = profile
    this.participantUsername = participantUsername
  }

  @Field()
  @PrimaryGeneratedColumn()
  public id: number

  @Field()
  @Column()
  public eventId!: number

  @Field()
  @Column()
  public profileId!: number

  @Field(() => Event)
  @ManyToOne(() => Event, (event: Event) => event.eventToProfiles)
  // @JoinColumn({ name: 'event_id' })
  public event!: Event

  @Field(() => Profile)
  @ManyToOne(() => Profile, (profile: Profile) => profile.eventToProfiles)
  // @JoinColumn({ name: 'profile_id' })
  public profile!: Profile

  @Field()
  @Column()
  public participantUsername!: string

  // @ManyToOne(() => Event, (event) => event.eventConnection)
  // @JoinColumn({ name: 'eventId' })
  // events: Promise<Event>

  // @ManyToOne(() => Profile, (profile) => profile.profileConnection)
  // @JoinColumn({ name: 'profileId' })
  // profiles: Promise<Profile>
}
