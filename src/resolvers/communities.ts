import {
  Resolver,
  Ctx,
  Query,
  Arg,
  Int,
  Mutation,
  InputType,
  Field,
  FieldResolver,
  Root,
} from 'type-graphql'

import { MyContext } from '../types'
import { getConnection } from 'typeorm'
import { User } from '../entities/User'

import { Profile } from '../entities/Profile'
import { Community } from '../entities/Community'
import { Repository } from 'typeorm'
import { CommunityParticipant } from '../entities/CommunityParticipant'

@InputType()
class CommunityInput {
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

@Resolver(Community)
export class CommunityResolver {
  constructor(
    private profileRepository: Repository<Profile> // dependency injection
  ) {} // private eventToProfileRepository: Repository<EventToProfile> // dependency injection

  @FieldResolver(() => User)
  creator(@Root() community: Community, @Ctx() { userLoader }: MyContext) {
    return userLoader.load(community.creatorId)
  }

  @FieldResolver(() => Profile)
  async participants(@Root() community: Community) {
    await this.profileRepository.find({})
    return community.participants
  }

  @Query(() => Community, { nullable: true })
  async community(
    @Arg('id', () => Int) id: number
  ): Promise<Community | undefined> {
    return await Community.findOne(id)
  }

  @Query(() => [Community])
  async communities(@Ctx() {}: MyContext): Promise<Community[]> {
    const communities = await getConnection()
      .getRepository(Community)
      .createQueryBuilder('community')
      .leftJoinAndSelect('community.participants', 'participant')
      .getMany()

    // communities.map((community) => {})
    console.log('RETURNED COMMUNITIES:', communities)

    return communities
  }

  @Mutation(() => Community)
  // @UseMiddleware(isAuth)
  async createCommunity(
    @Arg('input') input: CommunityInput,
    @Ctx() { req }: MyContext
  ): Promise<Community> {
    return await Community.create({
      ...input,
      creatorId: req.session.userId,
      startDate: new Date(),
      endDate: new Date(),
      username: 'fwefew' + Math.random(),
    }).save()
  }

  @Mutation(() => Boolean)
  async joinCommunity(
    @Arg('communityId', () => Int) communityId: number,
    @Ctx() { req }: MyContext
  ) {
    console.log('community id:', communityId)
    console.log('user id:', req.session.userId)

    const profile = await Profile.findOne({
      where: { userId: req.session.userId },
    })

    // const profiles = await getConnection()
    //   .getRepository(Profile)
    //   .createQueryBuilder('profile')
    //   .leftJoinAndSelect('profile.user', 'user')
    //   .getMany()

    // let profile = await getConnection()
    //   .getRepository(Profile)
    //   .createQueryBuilder('profile')
    //   .select('profile')
    //   .where('profile.userId = :userId', { userId: req.session.userId })
    //   .leftJoinAndSelect('user.profile', 'profile')
    //   .getOne()

    await CommunityParticipant.insert({
      profileId: profile?.uuid,
      communityId: communityId,
      participantUsername: profile?.username,
    })

    return true
  }
}
