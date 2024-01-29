import { Request, Response } from 'express'
import { Profile } from '../entities/Profile'
// import {
//   getFriendRequestsForProfile,
//   getFriendsForProfile,
// } from '../neo4j/neo4j_calls/neo4j_api'
// import { Search } from '../entities/Search'
const rpcClient = require('../utils/brokerInitializer')

class SearchController {
  static async getProfilesByUsername(req: Request, res: Response) {
    try {
      const options = req.body

      const senderProfile = await Profile.findOne({
        where: { userId: req.session.userId },
      })

      if (!senderProfile) {
        return res.status(401).json({ error: 'Not authenticated' })
      }

      await rpcClient.search().searchForProfileByUsername({
        username: options.query,
        senderUuid: senderProfile?.uuid,
      })

      return res.status(200).json(true)
    } catch (e) {
      console.log('Search error:', e.message)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
}

export default SearchController
