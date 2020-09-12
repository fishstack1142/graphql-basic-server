
import express from 'express';
// import server from './server'
// import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config()

import { ApolloServer }  from 'apollo-server-express'
import { typeDefs, resolvers } from './schema'


const server = new ApolloServer({
    typeDefs,
    resolvers
})

const app = express();

// const { DB_USER, DB_PASSWORD, DB_NAME } = process.env
const PORT = 4444;

// const createServer = async () => {
//   try {
//     await mongoose.connect(`mongodb+srv://${DB_USER}:${DB_PASSWORD}@graphql-basic.pmnob.gcp.mongodb.net/${DB_NAME}?retryWrites=true&w=majority`,
//     // { useUnifiedTopology: true }
//     )
  
    server.applyMiddleware({ app });
    
    app.listen({ port: PORT }, () =>
      console.log(`🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`)
    )
//   } catch(error) {
//     console.log(error)
//   }
// }

// createServer()