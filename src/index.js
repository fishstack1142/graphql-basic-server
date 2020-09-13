import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { ApolloServer } from "apollo-server-express";
import { typeDefs, resolvers } from "./schema";

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const PORT = process.env.PORT;

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
