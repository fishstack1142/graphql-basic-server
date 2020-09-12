import { gql } from "apollo-server-express";
import User from '../models/user'

//data from db
const users = [
  {
    id: "1",
    name: "Somchai1",
  },
  {
    id: "2",
    name: "Somchai2",
  },
  {
    id: "3",
    name: "Somchai3",
  },
];

export const resolvers = {
  Query: {
    //return data from database
    me: (parent, args, context, info) => users[2],
    user: (parent, args, context, info) => {
      const id = args.id;
      const user = User.findById(args.id);

      return user;
    },
    users: (parent, args, context, info) => User.find({}),
  },
  Mutation: {
      signup: async (parent, args, context, info) => {

        return User.create(args)
      }
  }
};

export const typeDefs = gql`
  type Query {
    me: User!
    user(id: ID!): User!
    users: [User]!
  }

  type User {
    id: ID!
    name: String!
    email: String!
    password: String!
  }

  type Mutation {
    signup(name: String!, email: String!, password: String!): User
  }

`;
