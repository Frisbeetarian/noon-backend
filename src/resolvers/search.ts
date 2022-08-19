import {
  Resolver,
  Query,
  Arg,
  Int,
  InputType,
  FieldResolver,
  Root,
  Ctx,
  Mutation,
} from 'type-graphql'
import { Profile } from '../entities/Profile'
import { Search } from '../entities/Search'
import { testQuery } from '../elasticsearch/index'
const rpcClient = require('../utils/brokerInitializer')

@Resolver(Search)
export class SearchResolver {
  @Query(() => Search, { nullable: true })
  async testQuery(): Promise<{ uuid: 1 }> {
    try {
      // const response = await testQuery()

      const response = await rpcClient
        .search()
        .searchForProfile({ profileUuid: 'lifewasntmadeforone' })
      console.log('response in resolver:', response)
    } catch (e) {
      console.log('error:', e)
    }

    return {
      uuid: 1,
    }
  }
}
