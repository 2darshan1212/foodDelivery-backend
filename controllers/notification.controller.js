import { Notification } from "../models/notification.model.js";
import { User } from "../models/user.model.js";
import { io, getReceiverSocketId } from "../socket/socket.js";

// Get all notifications for a user
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.id })
      .populate("sender", "username profilePicture")
      .populate("post", "image video mediaType")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      notifications
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to fetch notifications" 
    });
  }
};

// Create a new notification
export const createNotification = async (senderId, recipientId, type, message, postId = null, commentId = null) => {
  try {
    // Don't create notification if sender is the recipient
    if (senderId.toString() === recipientId.toString()) {
      return null;
    }

    const newNotification = new Notification({
      sender: senderId,
      recipient: recipientId,
      type,
      message,
      post: postId,
      comment: commentId,
    });

    const savedNotification = await newNotification.save();
    
    // Get populated notification for socket emission
    const populatedNotification = await Notification.findById(savedNotification._id)
      .populate("sender", "username profilePicture")
      .populate("post", "image video mediaType");

    // Emit notification through socket
    const receiverSocketId = getReceiverSocketId(recipientId.toString());
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newNotification", populatedNotification);
    }

    return savedNotification;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
};

// Mark a notification as read
export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const notification = await Notification.findById(notificationId);
    
    if (!notification) {
      return res.status(404).json({ 
        success: false, 
        message: "Notification not found" 
      });
    }
    
    // Ensure the user only marks their own notifications as read
    if (notification.recipient.toString() !== req.id) {
      return res.status(403).json({ 
        success: false, 
        message: "Unauthorized" 
      });
    }
    
    notification.read = true;
    await notification.save();
    
    return res.status(200).json({
      success: true,
      message: "Notification marked as read"
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to mark notification as read" 
    });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.id, read: false },
      { read: true }
    );
    
    return res.status(200).json({
      success: true,
      message: "All notifications marked as read"
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to mark all notifications as read" 
    });
  }
};

// Delete a notification
export const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const notification = await Notification.findById(notificationId);
    
    if (!notification) {
      return res.status(404).json({ 
        success: false, 
        message: "Notification not found" 
      });
    }
    
    // Ensure the user only deletes their own notifications
    if (notification.recipient.toString() !== req.id) {
      return res.status(403).json({ 
        success: false, 
        message: "Unauthorized" 
      });
    }
    
    await notification.deleteOne();
    
    return res.status(200).json({
      success: true,
      message: "Notification deleted"
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to delete notification" 
    });
  }
};

// Clear all notifications for a user
export const clearAllNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ recipient: req.id });
    
    return res.status(200).json({
      success: true,
      message: "All notifications cleared"
    });
  } catch (error) {
    console.error("Error clearing notifications:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to clear notifications" 
    });
  }
}; 