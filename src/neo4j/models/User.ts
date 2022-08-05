export const User = {
  id: {
    type: 'uuid',
    primary: true,
  },
  name: 'string',
  username: 'string',
  profile: {
    type: 'relationship',
    relationship: 'PROFILE',
    direction: 'out',
  },
  createdAt: {
    type: 'datetime',
    default: () => new Date(),
  },
}
