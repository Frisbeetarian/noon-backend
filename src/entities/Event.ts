import { Field, Int, ObjectType } from 'type-graphql'
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  // JoinTable,
  // ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Updoot } from './Updoot'
import { User } from './User'
// import { Profile } from './Profile'
// import { TypeormLoader } from 'type-graphql-dataloader'
import { EventToProfile } from './EventToProfile'
// import { Profile } from './Profile'
// import { MyContext } from '../types'

@ObjectType()
@Entity()
export class Event extends BaseEntity {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id!: number

  @Field()
  @Column({ unique: true })
  username!: string

  @Field()
  @Column()
  title!: string

  @Field()
  @Column()
  description!: string

  @Field()
  @Column()
  privacy!: string

  @Field({ nullable: true, defaultValue: new Date() })
  @Column()
  startDate?: Date

  @Field({ nullable: true, defaultValue: new Date() })
  @Column()
  endDate?: Date

  @Field()
  @Column()
  timezone: string

  @Field()
  @Column()
  creatorId: string

  @Field(() => User)
  @ManyToOne(() => User, (user) => user.events)
  creator: User

  // @OneToMany(() => Event, (event) => event.creator)
  // events: Event[]

  @OneToMany(() => Updoot, (updoot) => updoot.user)
  updoots: Updoot[]

  // @ManyToMany(() => Profile, (profile) => profile.events)
  // profiles: Profile[]

  // @Field(() => Profile)
  // @ManyToMany(() => Profile, (profile) => profile.events)
  // @JoinTable()
  // // @TypeormLoader()
  // profiles: Profile[]

  // @OneToMany(() => EventProfile, (ep) => ep.events)
  // eventConnection: Promise<EventProfile[]>

  // @Field(() => [Profile])
  // async profiles(@Ctx() { profilesLoader }: MyContext): Promise<Profile[]> {
  //   return profilesLoader.load(this.id)
  // }

  @Field(() => EventToProfile)
  @OneToMany(() => EventToProfile, (eventToProfile) => eventToProfile.event)
  public eventToProfiles!: EventToProfile[]

  @Column({ array: true })
  participants: string

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date
}
