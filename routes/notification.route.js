import express from "express";
import { 
  getNotifications, 
  markAsRead, 
  markAllAsRead, 
  deleteNotification, 
  clearAllNotifications 
} from "../controllers/notification.controller.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";

const router = express.Router();

// Get all notifications for the authenticated user
router.get("/", isAuthenticated, getNotifications);

// Mark a notification as read
router.patch("/mark-read/:notificationId", isAuthenticated, markAsRead);

// Mark all notifications as read
router.patch("/mark-all-read", isAuthenticated, markAllAsRead);

// Delete a specific notification
router.delete("/:notificationId", isAuthenticated, deleteNotification);

// Clear all notifications
router.delete("/", isAuthenticated, clearAllNotifications);

export default router; 