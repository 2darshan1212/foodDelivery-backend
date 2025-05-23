import express from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import { verifyAdmin } from "../middlewares/verifyAdmin.js";
import { verifyDeliveryAgent } from "../middlewares/verifyDeliveryAgent.js";
import {
  registerAsDeliveryAgent,
  updateAvailability,
  updateLocation,
  getNearbyOrders,
  acceptOrder,
  rejectOrder,
  completeDelivery,
  getAgentProfile,
  verifyDeliveryAgent as adminVerifyAgent,
  getAllAgents,
  getConfirmedOrders
} from "../controllers/deliveryAgent.controller.js";

const router = express.Router();

// Public endpoints
// None currently

// User endpoints
router.post("/register", verifyToken, registerAsDeliveryAgent);

// Delivery agent endpoints
router.put("/availability", verifyToken, verifyDeliveryAgent, updateAvailability);
router.put("/location", verifyToken, verifyDeliveryAgent, updateLocation);
router.get("/nearby-orders", verifyToken, verifyDeliveryAgent, getNearbyOrders);
router.get("/confirmed-orders", verifyToken, verifyDeliveryAgent, getConfirmedOrders);
router.post("/accept/:orderId", verifyToken, verifyDeliveryAgent, acceptOrder);
router.post("/reject/:orderId", verifyToken, verifyDeliveryAgent, rejectOrder);
router.put("/complete/:orderId", verifyToken, verifyDeliveryAgent, completeDelivery);
router.get("/profile", verifyToken, verifyDeliveryAgent, getAgentProfile);

// Admin endpoints
router.put("/admin/verify/:agentId", verifyToken, verifyAdmin, adminVerifyAgent);
router.get("/admin/all", verifyToken, verifyAdmin, getAllAgents);

export default router;