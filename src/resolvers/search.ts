import { Resolver, Query, Arg, UseMiddleware } from 'type-graphql'
import { Search } from '../entities/Search'
import { isAuth } from '../middleware/isAuth'
const rpcClient = require('../utils/brokerInitializer')

@Resolver(Search)
export class SearchResolver {
  @Query(() => [Search], { nullable: true })
  @UseMiddleware(isAuth)
  async searchForProfileByUsername(
    @Arg('username', () => String) username: string
  ): Promise<Search[] | null> {
    try {
      console.log('username in serach:', username)

      const response = await rpcClient
        .search()
        .searchForProfileByUsername({ username })

      console.log('response in resolver:', response)

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
      // console.log('response in resolver:', response)

      return response
    } catch (e) {
      console.log('error:', e)
      return null
    }

    return null
  }
}
