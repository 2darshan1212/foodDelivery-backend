import { Share } from "../models/share.model.js";
import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { getReceiverSocketId, io } from "../socket/socket.js";
import mongoose from "mongoose";

// Create a new share
export const createShare = async (req, res) => {
  try {
    const userId = req.id;
    const { postId, sharedWith, recipients, externalPlatform, message } = req.body;

    // Validate post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found"
      });
    }

    // Create share record
    const newShare = new Share({
      post: postId,
      sharedBy: userId,
      sharedWith,
      message: message || "",
      externalPlatform: externalPlatform || null,
    });

    // If sharing to specific users, validate and add recipients
    if (sharedWith === "specific" && recipients && recipients.length > 0) {
      // Validate recipients exist
      const validRecipients = await User.find({ _id: { $in: recipients } });
      if (validRecipients.length !== recipients.length) {
        return res.status(400).json({
          success: false,
          message: "One or more recipients do not exist"
        });
      }
      newShare.recipients = recipients;
    }

    // Save the share
    await newShare.save();
    
    // Increment post share count
    await Post.findByIdAndUpdate(postId, { $inc: { shareCount: 1 } });

    // Send notifications to recipients
    if (sharedWith === "specific" && recipients && recipients.length > 0) {
      for (const recipientId of recipients) {
        // Check if recipient is online
        const recipientSocketId = getReceiverSocketId(recipientId);
        
        // Prepare notification
        const notificationData = {
          type: "share",
          senderId: userId,
          recipientId,
          postId,
          message: message || "shared a post with you",
          timestamp: new Date(),
        };
        
        // Send socket notification if recipient is online
        if (recipientSocketId) {
          io.to(recipientSocketId).emit("newNotification", notificationData);
        }
        
        // TODO: Store notification in database if needed
      }
    } else if (sharedWith === "followers") {
      // Get user's followers
      const user = await User.findById(userId).select("followers");
      
      // Send notifications to followers
      if (user && user.followers && user.followers.length > 0) {
        for (const followerId of user.followers) {
          const followerSocketId = getReceiverSocketId(followerId.toString());
          
          // Prepare notification
          const notificationData = {
            type: "share",
            senderId: userId,
            recipientId: followerId,
            postId,
            message: message || "shared a post with their followers",
            timestamp: new Date(),
          };
          
          // Send socket notification if follower is online
          if (followerSocketId) {
            io.to(followerSocketId).emit("newNotification", notificationData);
          }
          
          // TODO: Store notification in database if needed
        }
      }
    }

    return res.status(201).json({
      success: true,
      message: "Post shared successfully",
      shareId: newShare._id,
      shareLink: newShare.shareLink,
    });
  } catch (error) {
    console.error("Share creation error:", error);
    
    // Handle duplicate share error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "You have already shared this post with these recipients"
      });
    }
    
    return res.status(500).json({
      success: false,
      message: "Error sharing post: " + error.message
    });
  }
};

// Get shares created by the current user
export const getMyShares = async (req, res) => {
  try {
    const userId = req.id;
    
    const shares = await Share.find({ sharedBy: userId })
      .populate("post")
      .populate("sharedBy", "username profilePicture")
      .populate("recipients", "username profilePicture")
      .sort({ createdAt: -1 });
    
    return res.status(200).json({
      success: true,
      shares
    });
  } catch (error) {
    console.error("Get my shares error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching shares: " + error.message
    });
  }
};

// Get shares shared with the current user
export const getSharesWithMe = async (req, res) => {
  try {
    const userId = req.id;
    
    const shares = await Share.find({ 
      recipients: userId,
      status: { $ne: "expired" } 
    })
      .populate("post")
      .populate("sharedBy", "username profilePicture")
      .sort({ createdAt: -1 });
    
    return res.status(200).json({
      success: true,
      shares
    });
  } catch (error) {
    console.error("Get shares with me error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching shares: " + error.message
    });
  }
};

// Get a specific share by ID
export const getShareById = async (req, res) => {
  try {
    const { shareId } = req.params;
    
    const share = await Share.findById(shareId)
      .populate("post")
      .populate("sharedBy", "username profilePicture")
      .populate("recipients", "username profilePicture");
    
    if (!share) {
      return res.status(404).json({
        success: false,
        message: "Share not found or has expired"
      });
    }
    
    // Check if share has expired
    if (share.expiresAt < new Date()) {
      return res.status(410).json({
        success: false,
        message: "This shared post has expired"
      });
    }
    
    return res.status(200).json({
      success: true,
      share
    });
  } catch (error) {
    console.error("Get share by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching share: " + error.message
    });
  }
};

// Mark share as viewed
export const markShareAsViewed = async (req, res) => {
  try {
    const { shareId } = req.params;
    const userId = req.id;
    
    const share = await Share.findById(shareId);
    
    if (!share) {
      return res.status(404).json({
        success: false,
        message: "Share not found"
      });
    }
    
    // Check if user is a recipient
    if (share.sharedWith === "specific" && 
        !share.recipients.some(recipient => recipient.toString() === userId)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this share"
      });
    }
    
    // Update status to viewed
    share.status = "viewed";
    await share.save();
    
    return res.status(200).json({
      success: true,
      message: "Share marked as viewed"
    });
  } catch (error) {
    console.error("Mark share as viewed error:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating share: " + error.message
    });
  }
};

// Delete a share
export const deleteShare = async (req, res) => {
  try {
    const { shareId } = req.params;
    const userId = req.id;
    
    const share = await Share.findById(shareId);
    
    if (!share) {
      return res.status(404).json({
        success: false,
        message: "Share not found"
      });
    }
    
    // Check if user is the one who shared
    if (share.sharedBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this share"
      });
    }
    
    await Share.findByIdAndDelete(shareId);
    
    return res.status(200).json({
      success: true,
      message: "Share deleted successfully"
    });
  } catch (error) {
    console.error("Delete share error:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting share: " + error.message
    });
  }
};

// Get share statistics for a post
export const getShareStats = async (req, res) => {
  try {
    const { postId } = req.params;
    
    // Validate post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found"
      });
    }
    
    // Get share count by platform
    const platformStats = await Share.aggregate([
      { $match: { post: new mongoose.Types.ObjectId(postId) } },
      { $group: { 
        _id: "$externalPlatform", 
        count: { $sum: 1 } 
      }},
      { $sort: { count: -1 } }
    ]);
    
    // Get total shares
    const totalShares = await Share.countDocuments({ post: postId });
    
    return res.status(200).json({
      success: true,
      stats: {
        totalShares,
        platformStats
      }
    });
  } catch (error) {
    console.error("Get share stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching share statistics: " + error.message
    });
  }
}; 