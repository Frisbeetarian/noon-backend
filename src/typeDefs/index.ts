const { gql } = require('apollo-server-core')

const typeDefs = gql`
  scalar Upload
  type File {
    filename: String!
    mimetype: String!
    encoding: String!
  }
  type Mutation {
    UploadImage(file: Upload!): File!
  }
`

module.exports = typeDefs
