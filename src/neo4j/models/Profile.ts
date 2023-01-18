export const Profile = {
  id: {
    type: 'uuid',
    primary: true,
  },
  name: 'string',
  username: {
    type: 'string',
    unique: true,
  },
  user: {
    type: 'relationship',
    relationship: 'USER',
    direction: 'out',
    eager: true,
  },
  friends: {
    type: 'relationship',
    relationship: 'FRIENDS',
    direction: 'out',
    eager: true,
  },
  friendshipRequest: {
    type: 'relationship',
    relationship: 'FRIENDSHIP_REQUEST',
    direction: 'out',
    eager: true,
  },
  createdAt: {
    type: 'datetime',
    default: () => new Date(),
  },
}
