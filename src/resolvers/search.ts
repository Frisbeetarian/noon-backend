import { Resolver, Query, Arg, UseMiddleware, Ctx } from 'type-graphql'
import { Search } from '../entities/Search'
import { isAuth } from '../middleware/isAuth'
import { Profile } from '../entities/Profile'
import { MyContext } from '../types'
const rpcClient = require('../utils/brokerInitializer')

@Resolver(Search)
export class SearchResolver {
  @Query(() => [Search], { nullable: true })
  @UseMiddleware(isAuth)
  async searchForProfileByUsername(
    @Ctx() { req }: MyContext,
    @Arg('username', () => String) username: string
  ): Promise<Search[] | null> {
    const senderProfile = await Profile.findOne({
      where: { userId: req.session.userId },
    })

    try {
      let response = await rpcClient.search().searchForProfileByUsername({
        username,
        senderUuid: senderProfile?.uuid,
      })

      return [response]
    } catch (e) {
      console.log('error:', e)
      return null
    }

    return null
  }

  @Query(() => Search, { nullable: true })
  async searchForProfileByUuid(
    @Arg('profileUuid', () => String) profileUuid: number | string
  ): Promise<Search | null> {
    try {
      const response = await rpcClient
        .search()
        .searchForProfile({ profileUuid })

      return response
    } catch (e) {
      console.log('error:', e)
      return null
    }

    return null
  }
}
