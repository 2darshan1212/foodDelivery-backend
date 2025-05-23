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

app.use(
  cors({
    origin:
      "https://food-delivery-frontend-q478-acapefam1-2darshan1212s-projects.vercel.app",
    credentials: true,
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
    server.close(() => {
      console.log("HTTP server closed.");

      // Close database connection
      console.log("Closing database connection...");
      mongoose.connection.close(false, () => {
        console.log("Database connection closed.");
        process.exit(0);
      });
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
