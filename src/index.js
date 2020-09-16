import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import jwt from 'jsonwebtoken'

import { ApolloServer } from "apollo-server-express";
import { typeDefs, resolvers } from "./schema";

const server = new ApolloServer({
  typeDefs,
  resolvers,
  //this is where we pass from apollo to context of each function resolvers
  context: ({ req }) => {
    const token = req.headers.authorization || ""

    console.log(token)

    const userId = getUser(token)

    return { userId }
  }
});

const PORT = process.env.PORT || 8080;

const getUser = token => {
  if (!token) return null

  const parsedToken = token.split(' ')[1]

  try {
    const decodedToken = jwt.verify(parsedToken, process.env.SECRET)

    return decodedToken.userId
    
  } catch (error) {
      return null;
  }
}

(async () => {
  try {
    await mongoose.connect(
      `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@graphql-basic.pmnob.gcp.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`
      ,{ useUnifiedTopology: true }
    );

    const app = express();

    server.applyMiddleware({ app });

    app.listen({ port: PORT }, () =>
      console.log(
        `🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`
      )
    );
  } catch (error) {
    console.log(error);
  }
})();
