import { gql } from "apollo-server-express";
import bcrypt from "bcryptjs";
import User from "../models/user";
import Product from "../models/product";

export const resolvers = {
  Query: {
    //return data from database
    user: (parent, args, context, info) => {
      return User.findById(args.id).populate({
        path: "createdProducts",
        populate: { path: "user" },
      });
    },

    users: (parent, args, context, info) => User.find({}),
    product: (parent, args, context, info) =>
      Product.findById(args.id).populate({
        path: "user",
        populate: { path: "products" },
      }),
    products: (parent, args, context, info) =>
      Product.find().populate({
        path: "user",
        populate: { path: "createdProducts" },
      }),
  },
  Mutation: {
    signup: async (parent, args, context, info) => {
      //check if email is existed
      const email = args.email.trim().toLowerCase();

      const currentUsers = await User.find({});
      const isEmailExist =
        currentUsers.findIndex(user => user.email === email) > -1;

      if (isEmailExist) {
        throw new Error("Email already exist.");
      }
      //end check if email is existed

      //then check password
      if (args.password.trim().length < 6) {
        throw new Error("Password must be at least 6 characters.");
      }

      const password = await bcrypt.hash(args.password, 10);

      //end check password

      return User.create({ ...args, email, password });
    },
    createProduct: async (parent, args, context, info) => {
      const userId = "5f5cec9f40b06e1a869ccb58";

      if (!args.description || !args.price || !args.imageUrl) {
        throw new Error("Please provide all required fields.");
      }

      const product = await Product.create({ ...args, user: userId });

      const user = await User.findById(userId);

      if (!user.createdProducts) {
        user.createdProducts = [product];
      } else {
        user.createdProducts.push(product);
      }

      await user.save();

      return Product.findById(product.id).populate({
        path: "user",
        populate: { path: "products" },
      });

      return product;
    },
  },
};

export const typeDefs = gql`
  type Query {
    me: User!
    user(id: ID!): User!
    users: [User]!
    product(id: ID!): Product
    products: [Product]!
  }

  type Mutation {
    signup(name: String!, email: String!, password: String!): User
    createProduct(
      description: String!
      price: Float!
      imageUrl: String!
    ): Product!
  }

  scalar Date

  type User {
    id: ID!
    name: String!
    email: String!
    password: String!
    createdProducts: [Product]
  }

  type Product {
    id: ID!
    description: String!
    price: Float!
    imageUrl: String!
    user: User!
  }
`;
