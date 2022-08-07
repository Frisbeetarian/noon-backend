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
import { createUserAndAssociateWithProfile } from '../neo4j/neo4j_calls/neo4j_api'
// import { Community } from '../entities/Community'
// import { Post } from '../entities/Post'
// import { resolveAny } from 'dns'
const uuidv4 = require('uuid').v4

declare module 'express-session' {
  interface Session {
    userId: number
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
    // console.log('LA ASMA&: ', user.profile)
    return user.profile
  }

  @FieldResolver(() => String)
  email(@Root() user: User, @Ctx() { req }: MyContext) {
    // this is the current user and its okay to show them logged user info
    if (req.session.userId === user.id) {
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

    const user = await getConnection()
      .getRepository(User)
      .createQueryBuilder('user')
      .select('user')
      .where('user.id = :id', { id: req.session.userId })
      .leftJoinAndSelect('user.profile', 'profile')
      .getOne()
    // console.log('USER 238ORH239UB392823923BF9UF: ', user)

    return user
    // return user
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
      { id: userIdNum },
      { password: await argon2.hash(newPassword) }
    )

    await redis.del(key)
    // log in user after change password
    req.session.userId = user.id

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
      user.id,
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

    try {
      // same logic differently written
      // User.create({}).save()

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

      user = await User.findOne(result.raw[0].id)
      // profile = await getConnection()
      //   .createQueryBuilder()
      //   .insert()
      //   .into(Profile)
      //   .values({
      //     username: user.username,
      //     userId: user.id,
      //     name: user.username,
      //   })
      //   .returning('*')
      //   .execute()

      // const user = await User.findOne(user.id)

      // if (user) {
      //   // result.profile = profile.raw[0]
      //   // await getConnection().manager.save(result)
      //
      //   await getConnection().transaction(async (tm) => {
      //     await tm.query(
      //       `
      //     update user
      //     set profileId = $1
      //     where "id" = $2
      //   `,
      //       [profile.raw[0].id, user.id]
      //     )
      //   })
      //
      //   await createUserAndAssociateWithProfile(user, profile.raw[0])
      // }
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

    req.session.userId = user.id
    let profile = await Profile.findOne({ where: { id: user?.profileId } })
    user = {
      ...user,
      profile: { id: profile?.id, username: profile?.username },
    }

    console.log('user in register:', user)
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

    let profile = await Profile.findOne({ where: { id: user?.profileId } })
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

    req.session.userId = user.id

    user = {
      ...user,
      profile: { id: profile?.id, username: profile?.username },
    }

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
