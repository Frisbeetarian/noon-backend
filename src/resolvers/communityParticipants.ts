import { Arg, Int, Query, Resolver } from 'type-graphql'
import { CommunityParticipant } from '../entities/CommunityParticipant'
import { getConnection } from 'typeorm'

@Resolver(CommunityParticipant)
export class CommunityParticipantsResolver {
  @Query(() => [CommunityParticipant])
  async getCommunityParticipants(
    @Arg('id', () => Int) id: number
  ): Promise<CommunityParticipant[] | undefined> {
    console.log('event id: ', id)

    const data = await CommunityParticipant.find({ communityId: id })
    console.log('community participants: ', data)
    return data
  }

  @Query(() => [CommunityParticipant])
  async getCommunitiesParticipants(
    @Arg('communitiesIds', () => [Int]) communitiesIds: [number]
  ): Promise<CommunityParticipant[] | undefined> {
    console.log('communities id: ', communitiesIds)

    // const data = await CommunityParticipant.findByIds({
    //   communityId: communitiesIds,
    // })

    const data = await getConnection()
      .createQueryBuilder(CommunityParticipant, 'cp')
      .where('cp.communityId IN (:...communitiesIds)', {
        communitiesIds: [1, 2],
      })
      .getMany()

    // const data = await getConnection()
    //   .getRepository(CommunityParticipant)
    //   .find({
    //     where: { communityId: communitiesIds },
    //   })
    // console.log('community participants: ', data)
    return data
  }
}
