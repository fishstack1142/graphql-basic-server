import { gql } from "apollo-server-express";
import bcrypt from "bcryptjs";
import User from "../models/user";
import Product from "../models/product";
import { GraphQLDateTime } from "graphql-iso-date";
import CartItem from "../models/cartItem";

export const resolvers = {
  Query: {
    //return data from database
    user: (parent, args, context, info) => {
      return User.findById(args.id)
        .populate({
          path: "createdProducts",
          populate: { path: "user" }
        })
        .populate({ path: "carts", populate: { path: "product" } });
    },

    users: (parent, args, context, info) =>
      User.find({})
        .populate({
          path: "createdProducts",
          populate: { path: "user" },
        })
        .populate({ path: "carts", populate: { path: "product" } }),

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
      const userId = "5f5d8f5a1ee46d394239b58f";

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
    addToCart: async (parent, args, context, info) => {
      const { id } = args;

      console.log(args.id);
      const userId = "5f5d9f65aa7a733ccfd0009b";

      try {
        const user = await User.findById(userId).populate({
          path: "carts",
          populate: { path: "product" },
        });

        console.log(user);

        const findCartItemIndex = user.carts.findIndex(
          cartItem => cartItem.product.id === args.id
        );

        console.log("fcii");
        console.log(findCartItemIndex);

        if (findCartItemIndex > -1) {
          user.carts[findCartItemIndex].quantity += 1;

          await CartItem.findByIdAndUpdate(user.carts[findCartItemIndex].id, {
            quantity: user.carts[findCartItemIndex].quantity,
          });

          const updatedCartItem = await CartItem.findById(
            user.carts[findCartItemIndex].id
          )
            .populate({ path: "product" })
            .populate({ path: "user" });

          return updatedCartItem;
        } else {
          const cartItem = await CartItem.create({
            product: id,
            quantity: 1,
            user: userId,
          });

          const newCartItem = await CartItem.findById(cartItem.id)
            .populate({ path: "product" })
            .populate({ path: "user" });

          //update user cart item
          await User.findByIdAndUpdate(userId, {
            carts: [...user.carts, newCartItem],
          });

          return newCartItem;
        }
      } catch (error) {
        console.log(error);
      }
    },
  },
  Date: GraphQLDateTime,
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
    addToCart(id: ID!): CartItem!
  }

  scalar Date

  type User {
    id: ID!
    name: String!
    email: String!
    password: String!
    createdProducts: [Product]
    carts: [CartItem]!
    createdAt: Date!
  }

  type Product {
    id: ID!
    description: String!
    price: Float!
    imageUrl: String!
    user: User!
    createdAt: Date!
  }

  type CartItem {
    id: ID!
    product: Product
    quantity: Int!
    user: User!
    createdAt: Date!
  }
`;
