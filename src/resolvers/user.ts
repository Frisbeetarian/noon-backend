// @ts-nocheck
import {
  Arg,
  Ctx,
  Field,
  Query,
  Mutation,
  ObjectType,
  Resolver,
  FieldResolver,
  Root,
  UseMiddleware,
} from 'type-graphql'
import { MyContext } from '../types'
import { User } from '../entities/User'
import argon2 from 'argon2'
import { UsernamePasswordInput } from './UsernamePasswordInput'
import { validateRegister } from '../utils/validateRegister'
import { sendEmail } from '../utils/sendEmail'
import { v4 } from 'uuid'
import { FORGET_PASSWORD_PREFIX } from '../constants'
import { getConnection } from 'typeorm'
import { Profile } from '../entities/Profile'
import {
  getFriendRequestsForProfile,
  getFriendsForProfile,
} from '../neo4j/neo4j_calls/neo4j_api'
import { Friend } from '../entities/Friend'
import { FriendshipRequest } from '../entities/FriendshipRequest'
import { isAuth } from '../middleware/isAuth'
// import rpcClient from '../utils/brokerInitializer'
const rpcClient = require('../utils/brokerInitializer')
const uuidv4 = require('uuid').v4

declare module 'express-session' {
  interface Session {
    userId: string
    user: any
  }
}

@ObjectType()
class FieldError {
  @Field()
  field: string
  @Field()
  message: string
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[]

  @Field(() => User, { nullable: true })
  user?: User
}

@Resolver(User)
export class UserResolver {
  @FieldResolver(() => Profile)
  profile(@Root() user: User) {
    return user.profile
  }

  @FieldResolver(() => [Friend])
  friends(@Root() user: User) {
    return user.friends
  }

  @FieldResolver(() => [FriendshipRequest])
  friendshipRequests(@Root() user: User | null) {
    return user.friendshipRequests
  }

  @FieldResolver(() => String)
  email(@Root() user: User, @Ctx() { req }: MyContext) {
    if (req.session.userId == user.uuid) {
      return user.email
    }

    return ''
  }

  @Query(() => User, { nullable: true })
  @UseMiddleware(isAuth)
  async me(@Ctx() { req }: MyContext) {
    if (!req.session.userId) {
      return null
    }

    let user = await getConnection()
      .getRepository(User)
      .createQueryBuilder('user')
      .select('user')
      .where('user.uuid = :id', { id: req.session.userId })
      .leftJoinAndSelect('user.profile', 'profile')
      .getOne()

    const friendsArray = await getFriendsForProfile(user?.profile?.uuid)
    const friendRequestsArray = await getFriendRequestsForProfile(
      user?.profile?.uuid
    )

    if (friendsArray.length !== 0) {
      user = { ...user, friends: friendsArray }
    } else {
      user = {
        ...user,
        friends: [],
      }
    }

    if (friendRequestsArray.length !== 0) {
      user = { ...user, friendshipRequests: friendRequestsArray }
    } else {
      user = {
        ...user,
        friendshipRequests: [],
      }
    }

    return user
  }

  @Mutation(() => UserResponse)
  async changePassword(
    @Arg('token') token: string,
    @Arg('newPassword') newPassword: string,
    @Ctx() { redis, req }: MyContext
  ): Promise<UserResponse> {
    if (newPassword.length <= 3) {
      return {
        errors: [
          {
            field: 'newPassword',
            message: 'length must be greater than 2',
          },
        ],
      }
    }

    const key = FORGET_PASSWORD_PREFIX + token
    const userId = await redis.get(FORGET_PASSWORD_PREFIX + token)

    if (!userId) {
      return {
        errors: [
          {
            field: 'token',
            message: 'token expired',
          },
        ],
      }
    }

    const userIdNum = parseInt(userId)
    const user = await User.findOne(userIdNum)

    if (!user) {
      return {
        errors: [
          {
            field: 'token',
            message: 'user no longer exists',
          },
        ],
      }
    }

    await User.update(
      { uuid: userIdNum },
      { password: await argon2.hash(newPassword) }
    )

    await redis.del(key)
    req.session.userId = user.uuid

    return { user }
  }

  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg('email') email: string,
    @Ctx() { redis }: MyContext
  ) {
    const user = await User.findOne({ where: { email } })

    if (!user) {
      return true
    }

    const token = v4()
    await redis.set(
      FORGET_PASSWORD_PREFIX + token,
      user.uuid,
      'ex',
      1000 * 60 * 60 * 24 * 3
    ) // 3 days

    await sendEmail(
      email,
      `<a href="http://localhost:3000/change-password/${token}">reset password</a>`
    )

    return true
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg('options') options: UsernamePasswordInput,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    try {
      const errors = validateRegister(options)

      if (errors) {
        return { errors }
      }

      const hashedPassword = await argon2.hash(options.password)
      let user

      const result = await getConnection()
        .createQueryBuilder()
        .insert()
        .into(User)
        .values({
          username: options.username,
          password: hashedPassword,
          email: options.email,
        })
        .returning('*')
        .execute()

      user = await User.findOne(result.raw[0].uuid)
      console.log('user in register:', user)

      console.log('user in register:', user)
      let profile = await Profile.findOne({ where: { userId: user?.uuid } })

      user = {
        ...user,
        profile: { uuid: profile?.uuid, username: profile?.username },
      }

      req.session.user = user
      req.session.userId = user.uuid

      const token = v4()

      // const response = rpcClient.relay().sendEmail({
      //   from: 'info@noon.com',
      //   email: 'mohamad.sleimanhaidar@gmail.com',
      //   task: 'send-welcome-email',
      //   subject: 'Registration done',
      //   html: `<a href="http://localhost:3000/change-password/${token}">reset password</a>`,
      // })

      return { user }
    } catch (error) {
      console.log('error:', error)

      // || error.detail.includes('already exists')
      if (error.code === '23505') {
        // duplicate username error
        return {
          errors: [
            {
              field: 'username',
              message: 'username already taken',
            },
          ],
        }
      }
    }
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg('username') username: string,
    @Arg('password') password: string,
    @Arg('rememberMe') rememberMe: boolean,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    let user = await User.findOne(
      username.includes('@')
        ? { where: { email: username } }
        : { where: { username: username } }
    )

    if (!user) {
      return {
        errors: [
          {
            field: 'usernameOrEmail',
            message: 'that username doesnt exist',
          },
        ],
      }
    }

    const valid = await argon2.verify(user.password, password)

    if (!valid) {
      return {
        errors: [
          {
            field: 'password',
            message: 'incorrect password',
          },
        ],
      }
    }

    let profile = await Profile.findOne({ where: { userId: user?.uuid } })

    user = {
      ...user,
      profile: { uuid: profile?.uuid, username: profile?.username },
    }

    if (rememberMe) {
      req.session.cookie.maxAge = 90 * 24 * 60 * 60 * 1000 // 90 days
    }

    req.session.user = user
    req.session.userId = user.uuid

    return {
      user,
    }
  }

  @Mutation(() => Boolean)
  logout(@Ctx() { req, res }: MyContext) {
    return new Promise((resolve) =>
      req.session.destroy((err) => {
        res.clearCookie('qid')
        if (err) {
          console.log(err)
          resolve(false)
          return
        } else {
          resolve(true)
        }
      })
    )
  }
}
