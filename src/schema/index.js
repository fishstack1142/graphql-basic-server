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
          populate: { path: "user" },
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
      const userId = "5f5d9f65aa7a733ccfd0009b";

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
    updateProduct: async (parent, args, context, info) => {
      const { id, description, price, imageUrl } = args;

      const userId = "5f5d9f65aa7a733ccfd0009b";

      if (!userId) throw new Error("Please log in.");

      const product = await Product.findById(id);

      if (userId !== product.user.toString()) {
        throw new Error("You are not authorized.");
      }

      const updateInfo = {
        description: !!description ? description : product.description,
        price: !!price ? price : product.price,
        imageUrl: !!imageUrl ? imageUrl : product.imageUrl,
      };

      //Update product in database
      await Product.findByIdAndUpdate(id, updateInfo);

      // Find the updated product
      return await Product.findById(id).populate({
        path: "user",
      });

      // return updatedProduct;
    },
    addToCart: async (parent, args, context, info) => {
      const { id } = args;

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
    deleteCart: async (parent, args, context, info) => {
      const { id } = args;

      const userId = "5f5d9f65aa7a733ccfd0009b";

      if (!userId) throw new Error("Please log in.");

      const cart = await CartItem.findById(id);

      const user = await User.findById(userId);

      //Check ownership of the cart
      if (cart.user.toString() !== userId) {
        throw new Error("Not authorized.");
      }

      const deletedCart = await CartItem.findOneAndRemove(id);

      const updatedUserCarts = user.carts.filter(
        cartId => cartId.toString() !== deletedCart.id.toString()
      );

      await User.findByIdAndUpdate(userId, { carts: updatedUserCarts });

      return deletedCart;
    },
  },
  Date: GraphQLDateTime,
};

export const typeDefs = gql`
  type Query {
    login: User!
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
    updateProduct(
      id: ID!
      description: String
      price: Float
      imageUrl: String
    ): Product!
    addToCart(id: ID!): CartItem!
    deleteCart(id: ID!): CartItem!
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
