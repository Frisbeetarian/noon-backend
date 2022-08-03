import { Arg, Int, Query, Resolver } from 'type-graphql'
import { CommunityParticipant } from '../entities/CommunityParticipant'
import { getConnection } from 'typeorm'

@Resolver(CommunityParticipant)
export class CommunityParticipantsResolver {
  @Query(() => [CommunityParticipant])
  async getCommunityParticipants(
    @Arg('id', () => Int) id: number
  ): Promise<CommunityParticipant[] | undefined> {
    return await CommunityParticipant.find({ communityId: id })
  }

  @Query(() => [CommunityParticipant])
  async getCommunitiesParticipants(
    @Arg('communitiesIds', () => [Int]) communitiesIds: [number]
  ): Promise<CommunityParticipant[] | undefined> {
    const data = await getConnection()
      .createQueryBuilder(CommunityParticipant, 'cp')
      .where('cp.communityId IN (:...communitiesIds)', {
        communitiesIds: communitiesIds,
      })
      .getMany()
    console.log('Participants: ', data)

    return data
  }
}
