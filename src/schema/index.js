import { gql } from "apollo-server-express";
import bcrypt from "bcryptjs";
import User from "../models/user";
import Product from "../models/product";
import { GraphQLDateTime } from "graphql-iso-date";
import CartItem from "../models/cartItem";
import jwt from "jsonwebtoken";
// import { randomBytes } from crypto;

const crypto = require("crypto");
const sgMail = require("@sendgrid/mail");

export const resolvers = {
  Query: {
    user: (parent, args, { userId }, info) => {
      if (!userId) throw new Error("Please log in");

      // if (userId !== args.id) throw new Error("Not authorized.");

      return User.findById(userId)
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
      Product.find()
        .populate({
          path: "user",
          populate: { path: "createdProducts" },
        })
        .sort({ createdAt: "desc" }),
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
    login: async (parent, args, context, info) => {
      const { email, password } = args;

      const user = await User.findOne({ email })
        .populate({
          path: "createdProducts",
          populate: { path: "user" },
        })
        .populate({ path: "carts", populate: { path: "product" } });

      if (!user) throw new Error("Email not found, please sign up,");

      const validPassword = await bcrypt.compare(password, user.password);

      if (!validPassword) throw new Error("Invalid email or password.");

      const token = jwt.sign({ userId: user.id }, process.env.SECRET, {
        expiresIn: "7days",
      });

      return { user, jwt: token };
    },
    requestResetPassword: async (parent, args, context, info) => {
      const { email } = args;

      console.log(args.email);

      const user = await User.findOne({ email });

      if (!user) throw new Error("Email not found, ");

      const resetPasswordToken = crypto.randomBytes(32).toString("hex");
      const resetTokenExpiry = Date.now() + 30 * 60 * 1000;

      await User.findByIdAndUpdate(user.id, {
        resetPasswordToken,
        resetTokenExpiry,
      });

      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      const msg = {
        to: user.email,
        from: `${process.env.SENDGRID_EMAIL}`,
        subject: "Reset password as you requested",
        html: `<div>
              <p>check the link below</p>\n\n
              <a href='${process.env.SENDGRID_RESET_URL}?token=${resetPasswordToken}' target='blank'>click here</a>
        </div>`,
      };

      sgMail.send(msg).then(
        () => {},
        error => {
          console.error(error);

          if (error.response) {
            console.error(error.response.body);
          }
        }
      );

      return { message: "Please check your email" };
    },
    createProduct: async (parent, args, { userId }, info) => {
      if (!userId) throw new Error("Please log in.");

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
    updateProduct: async (parent, args, { userId }, info) => {
      const { id, description, price, imageUrl } = args;

      if (!userId) throw new Error("Please log in.");

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
    addToCart: async (parent, args, { userId }, info) => {
      const { id } = args;

      if (!userId) throw new Error("Please log in.");

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
    deleteCart: async (parent, args, { userId }, info) => {
      const { id } = args;

      if (!userId) throw new Error("Please log in.");

      const cart = await CartItem.findById(id);

      console.log(cart);

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
    user: User
    users: [User]!
    product(id: ID!): Product
    products: [Product]!
  }

  type Mutation {
    signup(name: String!, email: String!, password: String!): User
    login(email: String!, password: String!): AuthData
    requestResetPassword(email: String!): Message!
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

  type AuthData {
    user: User
    jwt: String
  }

  type Message {
    message: String!
  }
`;
