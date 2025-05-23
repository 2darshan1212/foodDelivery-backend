import { Server } from "socket.io";
import express from "express";
import http from "http";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Maps to track different types of connections
const userSocketMap = {}; // userId -> socketId
const orderRooms = new Set(); // Set of active order room IDs
const deliveryAgentSocketMap = {}; // agentId -> socketId

// Helper functions to get socket IDs
export const getReceiverSocketId = (receiverId) => userSocketMap[receiverId];
export const getAgentSocketId = (agentId) => deliveryAgentSocketMap[agentId];

// Socket connection handling
io.on("connection", (socket) => {
  // Extract user ID from query parameters
  const userId = socket.handshake.query.userId;
  const isDeliveryAgent = socket.handshake.query.isDeliveryAgent === 'true';
  const agentId = socket.handshake.query.agentId;
  
  if (userId) {
    // Register the user as online
    userSocketMap[userId] = socket.id;
    console.log(`User connected: userId=${userId}, socketId=${socket.id}, isDeliveryAgent=${isDeliveryAgent}`);
    
    // If this is a delivery agent, add to the delivery agent map
    if (isDeliveryAgent && agentId) {
      deliveryAgentSocketMap[agentId] = socket.id;
      console.log(`Delivery agent connected: agentId=${agentId}, socketId=${socket.id}`);
    }
    
    // Broadcast updated online users list to all clients
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
    
    // Handle follow/unfollow notifications
    socket.on("follow", (data) => {
      const receiverSocketId = getReceiverSocketId(data.recipientId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("newNotification", {
          type: "follow",
          data
        });
      }
    });
    
    // Handle message read status
    socket.on("markMessagesRead", (data) => {
      const senderSocketId = getReceiverSocketId(data.senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit("messagesRead", {
          from: userId,
          to: data.senderId
        });
      }
    });
    
    // Handle notification read status
    socket.on("markNotificationsRead", (userId) => {
      socket.broadcast.emit("notificationsRead", userId);
    });
    
    // --- Delivery related socket events ---
    
    // Join an order room (for tracking delivery)
    socket.on("joinOrderRoom", (orderId) => {
      const roomId = `order_${orderId}`;
      socket.join(roomId);
      orderRooms.add(roomId);
      console.log(`User ${userId} joined order room ${roomId}`);
    });
    
    // Leave an order room
    socket.on("leaveOrderRoom", (orderId) => {
      const roomId = `order_${orderId}`;
      socket.leave(roomId);
      console.log(`User ${userId} left order room ${roomId}`);
    });
    
    // Update delivery location (from delivery agent)
    socket.on("updateDeliveryLocation", (data) => {
      const { orderId, location } = data;
      const roomId = `order_${orderId}`;
      
      // Broadcast to order room (customer tracking the delivery)
      io.to(roomId).emit("deliveryLocationUpdate", {
        orderId,
        location,
        timestamp: new Date()
      });
      
      console.log(`Location updated for order ${orderId}`);
    });
    
    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`User disconnected: userId=${userId}, socketId=${socket.id}`);
      delete userSocketMap[userId];
      
      // If this was a delivery agent, remove them from the agent map
      if (isDeliveryAgent && agentId) {
        delete deliveryAgentSocketMap[agentId];
        console.log(`Delivery agent disconnected: agentId=${agentId}`);
      }
      
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
  }
});

export { app, server, io };
