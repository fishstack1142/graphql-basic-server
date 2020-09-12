import { gql } from "apollo-server-express";


//data from db
const users = [
    {
        id: '1',
        name: 'Somchai1'
    },
    {
        id: '2',
        name: 'Somchai2'
    },
    {
        id: '3',
        name: 'Somchai3'
    }
]

export const resolvers = {

    Query: {
        //return data from database
        me: (parent, args, context, info) => users[2],
        user: (parent, args, context, info) => {

            const id  = args.id
            const user = users.find(u => u.id === id )

            return user
        },
        users: (parent, args, context, info) => users
    }
}

export const typeDefs = gql`
  type Query {
    me: User!
    user(id: ID!) : User!
    users: [User]!
  }

  type User {
    id: ID!
    name: String!
  }
`;
