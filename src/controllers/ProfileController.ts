// @ts-nocheck
import { Request, Response } from 'express'
import { Profile } from '../entities/Profile'
import {
  acceptFriendRequest,
  cancelFriendRequest,
  checkFriendship,
  getFriendRequestsForProfile,
  getFriendsForProfile,
  getProfileByUsername,
  sendFriendRequest,
  unfriend,
} from '../neo4j/neo4j_calls/neo4j_api'
import Emitters from '../socketio/emitters'
import { getIO } from '../socketio/socket'
import { getConnection } from 'typeorm'
import { Conversation } from '../entities/Conversation'
import { ConversationToProfile } from '../entities/ConversationToProfile'
import { Message } from '../entities/Message'

class ProfileController {
  static async getProfile(req: Request, res: Response) {
    try {
      const { profileUuid } = req.query

      if (!profileUuid) {
        return res.status(400).json({ error: 'Missing profileUuid' })
      }

      const profile = await Profile.findOne(profileUuid)

      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' })
      }

      const friendsArray = await getFriendsForProfile(profile.uuid)
      const friendRequestsArray = await getFriendRequestsForProfile(
        profile.uuid
      )

      if (friendsArray.length !== 0) {
        profile.friends = friendsArray
      } else {
        profile.friends = []
      }

      if (friendRequestsArray.length !== 0) {
        profile.friendshipRequests = friendRequestsArray
      } else {
        profile.friendshipRequests = []
      }

      return res.status(200).json(profile)
    } catch (e) {
      console.error('getProfile Error:', e)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  static async getProfileByUsername(req: Request, res: Response) {
    try {
      const { username } = req.query

      if (!username) {
        return res.status(400).json({ error: 'Missing username' })
      }

      const profile = await getProfileByUsername(username)

      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' })
      }

      return res.status(200).json(profile)
    } catch (e) {
      console.error('getProfile Error:', e)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  static async sendFriendRequest(req: Request, res: Response) {
    try {
      const { profileUuid } = req.body
      console.log('req.body in send friend request: ', profileUuid)
      const senderProfile = await Profile.findOne({
        where: { userId: req.session.userId },
      })

      if (!senderProfile) {
        return res.status(404).json({ error: 'Sender profile not found' })
      }

      const recipientProfile = await Profile.findOne(profileUuid)

      if (recipientProfile) {
        await sendFriendRequest(
          senderProfile?.uuid,
          senderProfile?.username,
          recipientProfile?.uuid,
          recipientProfile?.username
        )

        const io = getIO()
        const emitters = new Emitters(io)
        const content = senderProfile.username + ' wants to be your friend.'

        emitters.emitFriendRequest(
          senderProfile.uuid,
          senderProfile.username,
          recipientProfile.uuid,
          recipientProfile.username,
          content
        )

        return res.status(200).json({ message: 'Friend request sent' })
      } else {
        return res.status(404).json({ error: 'Recipient profile not found' })
      }
    } catch (e) {
      console.error('getProfile Error:', e.message)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  static async getFriendRequests(req: Request, res: Response) {
    try {
      const senderProfile = await Profile.findOne({
        where: { userId: req.session.userId },
      })

      if (!senderProfile) {
        return res.status(404).json({ error: 'Sender profile not found' })
      }

      const friendRequestsArray = await getFriendRequestsForProfile(
        senderProfile.uuid
      )

      if (friendRequestsArray.length !== 0) {
        return res.status(200).json(friendRequestsArray)
      } else {
        return res.status(200).json([])
      }
    } catch (e) {
      console.error('getProfile Error:', e.message)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  static async cancelFriendRequest(req: Request, res: Response) {
    try {
      const { profileUuid } = req.body

      const senderProfile = await Profile.findOne({
        where: { userId: req.session.userId },
      })

      if (!senderProfile) {
        return res.status(404).json({ error: 'Sender profile not found' })
      }

      const recipientProfile = await Profile.findOne(profileUuid)

      if (!recipientProfile) {
        return res.status(404).json({ error: 'Recipient profile not found' })
      }

      await cancelFriendRequest(
        senderProfile?.uuid,
        senderProfile?.username,
        recipientProfile?.uuid,
        recipientProfile?.username
      )

      const io = getIO()
      const emitters = new Emitters(io)
      const content = senderProfile.username + ' cancelled the friend request.'

      emitters.emitCancelFriendRequest(
        senderProfile.uuid,
        senderProfile.username,
        recipientProfile.uuid,
        recipientProfile.username,
        content
      )

      return res.status(200).json({ message: 'Friend request sent' })
    } catch (e) {
      console.error('Error:', e.message)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  static async acceptFriendRequest(req: Request, res: Response) {
    try {
      const { profileUuid } = req.body

      const senderProfile = await Profile.findOne({
        where: { userId: req.session.userId },
      })

      if (!senderProfile) {
        return res.status(404).json({ error: 'Recipient profile not found' })
      }

      const recipientProfile = await Profile.findOne(profileUuid)

      if (!recipientProfile) {
        return res.status(404).json({ error: 'Sender profile not found' })
      }

      const areFriends = await checkFriendship(
        senderProfile?.uuid,
        recipientProfile?.uuid
      )

      if (!areFriends) {
        await acceptFriendRequest(
          senderProfile?.uuid,
          senderProfile?.username,
          recipientProfile?.uuid,
          recipientProfile?.username
        )

        const conversationRepository =
          getConnection().getRepository(Conversation)
        const conversationProfileRepository = getConnection().getRepository(
          ConversationToProfile
        )

        let conversation = new Conversation()
        await conversationRepository.save(conversation)

        const conversationToProfile = new ConversationToProfile(
          conversation,
          recipientProfile,
          recipientProfile?.username
        )

        await conversationProfileRepository.save(conversationToProfile)
        const conversationToProfile2 = new ConversationToProfile(
          conversation,
          senderProfile,
          senderProfile?.username
        )

        await conversationProfileRepository.save(conversationToProfile2)

        conversation = {
          ...conversation,
          unreadMessages: 0,
          messages: [],
          calls: [
            {
              profileUuid: senderProfile?.uuid,
              profileUsername: senderProfile?.username,
              pendingCall: false,
              ongoingCall: false,
            },
            {
              profileUuid: recipientProfile?.uuid,
              profileUsername: recipientProfile?.username,
              pendingCall: false,
              ongoingCall: false,
            },
          ],
          ongoingCall: false,
          pendingCall: false,
          pendingCallProfile: null,
          profiles: [
            {
              uuid: senderProfile?.uuid,
              username: senderProfile?.username,
            },
            {
              uuid: recipientProfile?.uuid,
              username: recipientProfile?.username,
            },
          ],
        }

        const io = getIO()
        const emitters = new Emitters(io)
        const content =
          senderProfile.username + ' accepted your friend request.'

        emitters.acceptFriendRequest(
          senderProfile.uuid,
          senderProfile.username,
          recipientProfile.uuid,
          recipientProfile.username,
          content,
          conversation
        )

        return res.status(200).json(conversation)
      } else {
        return res.status(400).json({ error: 'Already friends' })
      }
    } catch (e) {
      console.error('Error:', e.message)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  static async unfriend(req: Request, res: Response) {
    try {
      const { profileUuid, conversationUuid } = req.body

      const senderProfile = await Profile.findOne({
        where: { userId: req.session.userId },
      })

      if (!senderProfile) {
        return res.status(404).json({ error: 'Sender profile not found' })
      }

      const recipientProfile = await Profile.findOne(profileUuid)

      if (!recipientProfile) {
        return res.status(404).json({ error: 'Recipient profile not found' })
      }

      await getConnection()
        .createQueryBuilder()
        .delete()
        .from(ConversationToProfile)
        .where('conversationUuid = :conversationUuid', {
          conversationUuid,
        })
        .execute()

      await getConnection()
        .createQueryBuilder()
        .delete()
        .from(Message)
        .where('conversationUuid = :conversationUuid', {
          conversationUuid,
        })
        .execute()

      await getConnection()
        .createQueryBuilder()
        .delete()
        .from(Conversation)
        .where('uuid = :conversationUuid', {
          conversationUuid,
        })
        .execute()

      await unfriend(
        senderProfile?.uuid,
        senderProfile?.username,
        recipientProfile?.uuid,
        recipientProfile?.username
      )

      const io = getIO()
      const emitters = new Emitters(io)
      const content = senderProfile.username + ' unfriended you.'

      emitters.unfriend(
        senderProfile.uuid,
        senderProfile.username,
        recipientProfile.uuid,
        recipientProfile.username,
        content,
        conversationUuid
      )

      return res.status(200).json('Unfriended')
    } catch (e) {
      console.error('Error:', e.message)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
}

export default ProfileController
