export const User = {
  id: {
    type: 'uuid',
    primary: true,
  },
  name: 'string',
  username: {
    type: 'string',
    unique: true,
  },
  profile: {
    type: 'relationship',
    relationship: 'PROFILE',
    direction: 'out',
    eager: true,
  },
  createdAt: {
    type: 'datetime',
    default: () => new Date(),
  },
}
