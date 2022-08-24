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

  @Field(() => User, { nullable: false })
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
    // this is the current user and its okay to show them logged user info
    if (req.session.userId == user.uuid) {
      return user.email
    }

    // current user wants to see other user's info
    return ''
  }

  @Query(() => User, { nullable: true })
  async me(@Ctx() { req }: MyContext) {
    // console.log('session: ' + JSON.stringify(req.session))
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

    // console.log('friendRequestsArray: ', friendRequestsArray)

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
    console.log('UAWER:', user)

    // console.log('USER 238ORH239UB392823923BF9UF: ', user)
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

    // user.password = await argon2.hash(newPassword)
    // await em.persistAndFlush(user)
    await User.update(
      { uuid: userIdNum },
      { password: await argon2.hash(newPassword) }
    )

    await redis.del(key)
    // log in user after change password
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
      // the email is not in the db
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
    const errors = validateRegister(options)
    if (errors) {
      return { errors }
    }
    const hashedPassword = await argon2.hash(options.password)
    let user
    console.log('ENTER REGISTER')
    try {
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
      // user = result.raw[0]

      user = await User.findOne(result.raw[0].uuid)
      console.log('user in register:', user)
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
    console.log('user in register:', user)

    let profile = await Profile.findOne({ where: { userId: user?.uuid } })

    user = {
      ...user,
      profile: { uuid: profile?.uuid, username: profile?.username },
    }

    req.session.user = user
    req.session.userId = user.uuid

    console.log('user in register:', req.session.user)
    console.log('user in register:', req.session.userId)
    return { user }
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg('usernameOrEmail') usernameOrEmail: string,
    @Arg('password') password: string,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    let user = await User.findOne(
      usernameOrEmail.includes('@')
        ? { where: { email: usernameOrEmail } }
        : { where: { username: usernameOrEmail } }
    )
    let profile = await Profile.findOne({ where: { uuid: user?.profileId } })

    if (!user) {
      return {
        errors: [
          {
            field: 'usernameOrEmail',
            message: 'that usernaaaaaame doesnt exist',
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

    user = {
      ...user,
      profile: { id: profile?.uuid, username: profile?.username },
    }

    req.session.userId = user.uuid
    req.session.user = user
    console.log('FSDFSDFDSFSDF:', user)

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
