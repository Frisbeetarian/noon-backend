import {
  Resolver,
  Ctx,
  Query,
  Arg,
  Int,
  Mutation,
  InputType,
  Field,
  ObjectType,
  FieldResolver,
  Root,
  // ResolverInterface,
} from 'type-graphql'
import { Event } from '../entities/Event'
// import { Post } from '../entities/Post'
import { MyContext } from '../types'
import { getConnection, Repository } from 'typeorm'
import { User } from '../entities/User'
// import { Post } from '../entities/Post'
import { Profile } from '../entities/Profile'
// import argon2 from 'argon2'
// import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity'
import { EventToProfile } from '../entities/EventToProfile'
// import { Updoot } from '../entities/Updoot'
// import { Post } from '../entities/Post'
// import { MyContext } from '../types'
// import { Post } from '../entities/Post'

@InputType()
class EventInput {
  @Field()
  title: string
  @Field()
  description: string
  @Field()
  privacy: string
  @Field()
  timezone: string
  @Field({ nullable: true })
  startDate?: Date
  @Field({ nullable: true })
  endDate?: Date
}

@ObjectType()
class PaginatedEvents {
  @Field(() => [Event])
  events: Event[]
  @Field()
  hasMore: boolean
}

@Resolver(Event)
export class EventResolver {
  constructor() {} // private eventToProfileRepository: Repository<EventToProfile> // dependency injection

  @FieldResolver(() => User)
  creator(@Root() event: Event, @Ctx() { userLoader }: MyContext) {
    return userLoader.load(event.creatorId)
  }

  @FieldResolver(() => EventToProfile)
  async eventToProfiles(
    @Root() event: Event
  ): Promise<{ eventToProfiles: EventToProfile[] } | undefined> {
    const eventsToProfilesRepository: Repository<EventToProfile> =
      getConnection().getRepository(EventToProfile)

    // console.log('eventsToProfiles:', event)

    const eventsToProfiles = await eventsToProfilesRepository.find({
      where: { eventId: event.id },
    })

    // console.log('motherufcker: ' + JSON.stringify(eventsToProfiles))

    if (eventsToProfiles) {
      return { eventToProfiles: eventsToProfiles }
    }

    // return undefined
  }

  // @FieldResolver(() => [Profile])
  // profiles(@Root() event: Event, @Ctx() { profileLoader }: MyContext) {
  //   let temparray = []
  //   event.profiles.map((profile) => {
  //     temparray.push(profile.id)
  //   })
  //
  //   console.log('event.profiles: ', event.profiles)
  //   return event.profiles
  //
  //   // return profileLoader.load(temparray)
  // }

  @Query(() => Event, { nullable: true })
  async event(@Arg('id', () => Int) id: number): Promise<Event | undefined> {
    return await Event.findOne(id)
    // let tempProfiles = event?.eventToProfiles
    // event?.eventToProfiles = []
    // event?.eventToProfiles.push({
    //   id: tempProfiles[0].id,
    //   eventId: tempProfiles[0].eventId,
    //   profileId: tempProfiles[0].profileId,
    // })
    // console.log('EVENT: ', event)
    // return event
  }

  @Query(() => PaginatedEvents)
  async events(
    @Arg('limit', () => Int) limit: number,
    @Arg('cursor', () => String, { nullable: true }) cursor: string | null,
    @Ctx() {}: MyContext
  ): Promise<PaginatedEvents> {
    const realLimit = Math.min(50, limit)
    const reaLimitPlusOne = realLimit + 1
    const replacements: any[] = [reaLimitPlusOne]

    if (cursor) {
      replacements.push(new Date(parseInt(cursor)))
    }

    //     select e.*, b.*
    //     from event e right join event_to_profile b
    // on e.id = b.${`"eventId"`}

    let events = await getConnection().query(
      `
    select e.*
    from event e
    ${cursor ? `where e."createdAt" < $2` : ''}
    order by e."createdAt" DESC
    limit $1
    `,
      replacements
    )

    events.map(async (event) => {
      await EventToProfile.find({
        eventId: event.id,
      }).then((data) => {
        if (data) {
          event.participants.push(data)
          console.log('EVENT', event)
        }
      })

      // if (participants) {
      // event.participants = []

      // console.log('EVENT', event)
      // }
      // const participants = await getConnection().query(
      //   `
      //     select t.*,
      //     from event_to_profile
      //     on ${event.id} = t.${`eventId`}
      //   `
      // )
    })

    console.log('events', events)

    // const participants = await getConnection().query(
    //   `
    // select e.*
    // from event e inner join event_to_profile b
    // on e.id = b.eventId
    // ${cursor ? `where e."createdAt" < $2` : ''}
    // order by e."createdAt" DESC
    // limit $1
    // `
    // )

    return {
      events: events.slice(0, realLimit),
      hasMore: events.length === reaLimitPlusOne,
    }
  }

  @Mutation(() => Event)
  // @UseMiddleware(isAuth)
  async createEvent(
    @Arg('input') input: EventInput,
    @Ctx() { req }: MyContext
  ): Promise<Event> {
    return await Event.create({
      ...input,
      creatorId: req.session.userId,
      startDate: new Date(),
      endDate: new Date(),
      username: 'fwefew' + Math.random(),
      participants: [] as any,
    }).save()
  }

  @Mutation(() => Event)
  async joinEvent(
    // @Arg('profileId', () => Int) profileId: number,
    @Arg('eventId', () => Int) eventId: number,
    @Ctx() { req }: MyContext
  ): Promise<Event | Profile | Boolean> {
    // public async findById (id: number): Promise<Client> {
    console.log('req.session.userId: ', req.session.userId)
    console.log('event id: ', eventId)
    const eventsToProfilesRepository: Repository<EventToProfile> =
      getConnection().getRepository(EventToProfile)

    const profile = await Profile.findOne({
      where: { userId: req.session.userId },
    })

    const event = await Event.findOne({
      where: { id: eventId },
    })

    if (profile && event) {
      const eventProfile = new EventToProfile(event, profile, profile.username)
      await eventsToProfilesRepository.save(eventProfile)
      // await EventToProfile.create({ eventId, profileId: profile.id }).save()
      return event
    }

    return false
    // let user = await User.findOne(req.session.userId)
    // console.log('FWEFWEFWEF:', user)
    // const profile = await Profile.findOne({
    //   where: { userId: req.session.userId },
    // })
    //
    // // let profile = user.profile
    // console.log('FWEFWEFWEF:', profile)
    //
    // let event = await Event.findOne(eventId)
    //
    // if (profile && event) {
    //   // profile.username = '3333'
    //   event.profiles = [profile]
    //   event = await getConnection().manager.save(event)
    //   console.log('event: ', event)
    // }
    //
    // return event

    // const categoriesWithQuestions = await dataSource
    //   .getRepository(Category)
    //   .createQueryBuilder('category')
    //   .leftJoinAndSelect('category.questions', 'question')
    //   .getMany()
    //
    // const result = await getConnection()
    //   .getRepository(Profile)
    //   .createQueryBuilder('profile')
    //   .leftJoinAndSelect('profile.events', 'event')
    //   .getMany()

    // .insert()
    // .into(User)
    // .values({
    //   username: options.username,
    //   password: hashedPassword,
    //   email: options.email,
    // })
    // .returning('*')
    // .execute()

    // await Profile.findOne(req.session.userId)
    // console.log('FEWfwejknfewljkfewkjbf')
    // return await Profile.findOne(profileId).then(async (profile) => {
    //   // @ts-ignore
    //   console.log('profile: ', profile)
    //   if (profile) {
    //     await Event.findOne(eventId).then(async (event) => {
    //       if (event) {
    //         profile.events = [event]
    //       }
    //     })
    //   }
    //   // response.events = [await Event.findOne(eventId)]
    //   // await Profile.update({ id: profileId }, { events: [response.id] })
    // })
  }
}
