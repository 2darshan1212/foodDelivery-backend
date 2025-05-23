import express from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import { verifyAdmin } from "../middlewares/verifyAdmin.js";
import { 
  createOrder, 
  getUserOrders, 
  getOrderById, 
  cancelOrder, 
  reorder,
  getAllOrders,
  updateOrderStatus,
  getOrderStats,
  getOrderStatusHistory,
  assignOrderAgent
} from "../controllers/order.controller.js";

const router = express.Router();

// User endpoints
// Create a new order
router.post("/create", verifyToken, createOrder);

// Get all orders for the current user
router.get("/user-orders", verifyToken, getUserOrders);

// Get a specific order by ID
router.get("/:id", verifyToken, getOrderById);

// Cancel an order
router.put("/:id/cancel", verifyToken, cancelOrder);

// Reorder (create a new order from previous order)
router.post("/:id/reorder", verifyToken, reorder);

// Update order status (can be used by regular users)
router.put("/:id/status", verifyToken, updateOrderStatus);

// Admin endpoints
// Get all orders with filters and pagination
router.get("/admin/all", verifyToken, verifyAdmin, getAllOrders);

// Get order statistics
router.get("/admin/stats", verifyToken, verifyAdmin, getOrderStats);

// Update order status
router.put("/admin/:id/status", verifyToken, verifyAdmin, updateOrderStatus);

// Get order status history
router.get("/admin/:id/status-history", verifyToken, verifyAdmin, getOrderStatusHistory);

// Assign delivery agent
router.put("/admin/:id/assign-agent", verifyToken, verifyAdmin, assignOrderAgent);

export default router; 