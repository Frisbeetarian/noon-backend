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

@Resolver(Search)
export class SearchResolver {
  @Query(() => Search, { nullable: true })
  async testQuery(): Promise<{ uuid: 1 }> {
    console.log('VVVVVVV')
    try {
      const response = await testQuery()
      console.log('response:', response)
    } catch (e) {
      console.log('error:', e)
    }

    return {
      uuid: 1,
    }
  }
}
