import express, { urlencoded } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./utils/db.js";
import mongoose from "mongoose";
import {
  setupChangeStreams,
  closeChangeStreams,
} from "./utils/changeStreams.js";
import userRoute from "./routes/user.route.js";
import postRoute from "./routes/post.route.js";
import storyRoute from "./routes/storyRoutes.js";
import messageRoute from "./routes/message.route.js";
import notificationRoute from "./routes/notification.route.js";
import shareRoute from "./routes/share.route.js";
import orderRoute from "./routes/order.route.js";
import categoryRoute from "./routes/category.route.js";
import deliveryAgentRoute from "./routes/deliveryAgent.route.js";
import { app, server, io } from "./socket/socket.js";

dotenv.config({});

const PORT = process.env.PORT || 3000;
//middlewares

// CORS configuration - Allow all valid frontend origins
const allowedOrigins = [
  "https://food-delivery-frontend-r4bs.vercel.app",
  "https://food-delivery-frontend.vercel.app",
  "http://localhost:5173", // Local development Vite default
  "http://localhost:3000", // Local development alternative
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, etc)
      if (!origin) return callback(null, true);

      // Check if the origin is in our allowed list
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.warn(`Origin ${origin} not allowed by CORS`);
        // Still allow the request to proceed even if origin isn't in our list
        // This makes development easier while still logging potential issues
        callback(null, true);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Content-Range", "X-Content-Range"],
    maxAge: 600, // Cache preflight requests for 10 minutes
  })
);

// Make io available throughout the app
app.set("io", io);

app.use(express.json());
app.use(cookieParser());
app.use(urlencoded({ extended: true }));

//api's
app.use("/api/v1/user", userRoute);
app.use("/api/v1/post", postRoute);
app.use("/api/v1/message", messageRoute);
app.use("/api/v1/story", storyRoute);
app.use("/api/v1/notifications", notificationRoute);
app.use("/api/v1/share", shareRoute);
app.use("/api/v1/orders", orderRoute);
app.use("/api/v1/category", categoryRoute);
app.use("/api/v1/delivery", deliveryAgentRoute);

//Routes
app.get("/", (req, res) => {
  res.send("welcome to food delivery app");
});

// API health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Server is running",
    time: new Date().toISOString(),
    routes: {
      orders: "/api/v1/orders",
      posts: "/api/v1/post",
      users: "/api/v1/user",
      delivery: "/api/v1/delivery",
    },
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
  });
});

server.listen(PORT, async () => {
  await connectDB();
  console.log(`Server is running on port ${PORT}`);

  // Set up MongoDB change streams for real-time updates
  await setupChangeStreams();
});

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);

  try {
    // Close change streams first
    console.log("Closing change streams...");
    await closeChangeStreams();

    // Close the server
    console.log("Closing HTTP server...");
    server.close(async () => {
      console.log("HTTP server closed.");

      // Close database connection
      console.log("Closing database connection...");
      await mongoose.connection.close();
    });

    // Force close after timeout
    setTimeout(() => {
      console.error("Forced shutdown after timeout!");
      process.exit(1);
    }, 10000);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
};

// Set up signal handlers for graceful shutdown
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  gracefulShutdown("uncaughtException");
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("unhandledRejection");
});
