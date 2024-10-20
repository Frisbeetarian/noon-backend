import { Model, DataTypes, Optional } from 'sequelize'
import { sequelize } from '../data-source'
import { Profile } from './Profile'

interface UserAttributes {
  uuid: string
  username: string
  email?: string
  password: string
  publicKey?: string
  privateKeyIV?: string
  masterKeyIV?: string
  salt?: string
  profileUuid?: string
  updatedAt?: Date
  createdAt?: Date
}

interface UserCreationAttributes
  extends Optional<
    UserAttributes,
    | 'uuid'
    | 'email'
    | 'publicKey'
    | 'privateKeyIV'
    | 'masterKeyIV'
    | 'salt'
    | 'profileUuid'
    | 'updatedAt'
    | 'createdAt'
  > {}

export class User
  extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes
{
  public uuid!: string
  public username!: string
  public email?: string
  public password!: string
  public publicKey?: string
  public privateKeyIV?: string
  public masterKeyIV?: string
  public salt?: string
  public profileUuid?: string
  public updatedAt!: Date
  public createdAt!: Date
  public profile?: Profile
}

User.init(
  {
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    publicKey: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    privateKeyIV: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    masterKeyIV: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    salt: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    profileUuid: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true,
    underscored: true,
  }
)
