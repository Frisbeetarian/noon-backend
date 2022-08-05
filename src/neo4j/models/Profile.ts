export const Profile = {
  id: {
    type: 'uuid',
    primary: true,
  },
  name: 'string',
  user: {
    type: 'relationship',
    relationship: 'USER',
    direction: 'out',
  },
  createdAt: {
    type: 'datetime',
    default: () => new Date(),
  },
}
