// for chatting
import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";
import { User } from "../models/user.model.js";
import { getReceiverSocketId, io } from "../socket/socket.js";
import { createNotification } from "./notification.controller.js";
import { uploadToCloudinary } from "../middlewares/fileUpload.js";

export const sendMessage = async (req, res) => {
  try {
    const senderId = req.id;
    const receiverId = req.params.id;
    const { textMessage: message } = req.body;
    
    console.log("Received message request:", { 
      senderId, 
      receiverId, 
      message, 
      hasFile: !!req.file 
    });
    
    // File upload handling
    let fileUrl = null;
    let fileType = null;
    let fileName = null;
    
    if (req.file) {
      console.log("Processing file:", req.file.originalname, req.file.mimetype);
      // Upload file to Cloudinary
      try {
        const result = await uploadToCloudinary(req.file);
        console.log("Cloudinary upload result:", result);
        fileUrl = result.url;
        fileType = result.fileType;
        fileName = req.file.originalname;
      } catch (uploadError) {
        console.error("File upload error:", uploadError);
        return res.status(400).json({ success: false, message: "File upload failed" });
      }
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
    });
    if (!conversation) {
      console.log("Creating new conversation between", senderId, "and", receiverId);
      conversation = await Conversation.create({
        participants: [senderId, receiverId],
      });
    }
    
    const newMessage = await Message.create({
      senderId,
      receiverId,
      message: message || "",
      fileUrl,
      fileType,
      fileName
    });
    
    console.log("New message created:", {
      id: newMessage._id,
      hasFile: !!fileUrl,
      fileType,
      message: message || ""
    });
    
    if (newMessage) conversation.messages.push(newMessage._id);

    await Promise.all([conversation.save(), newMessage.save()]);
    
    // Get sender information for the notification
    const sender = await User.findById(senderId).select("username profilePicture");
    
    // Determine notification message based on content type
    let notificationMessage = `${sender.username} sent you a message`;
    if (fileType === 'image') {
      notificationMessage = `${sender.username} sent you an image`;
    } else if (fileType === 'document') {
      notificationMessage = `${sender.username} sent you a file: ${fileName}`;
    } else if (message) {
      notificationMessage = `${sender.username} sent you a message: "${message.substring(0, 30)}${message.length > 30 ? '...' : ''}"`;
    }
    
    //implementing socket IO for real time data tarnsfer
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      console.log("Emitting new message to socket:", receiverSocketId);
      // Send the message via socket
      io.to(receiverSocketId).emit("newMessage", newMessage);
      
      // Also create a notification record
      await createNotification(
        senderId,
        receiverId,
        "message",
        notificationMessage,
        null,
        null
      );
    }

    return res.status(201).json({
      success: true,
      newMessage,
    });
  } catch (error) {
    console.error("Error in sendMessage:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getMessage = async (req, res) => {
  try {
    const senderId = req.id;
    const receiverId = req.params.id;
    const conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
    }).populate("messages");
    if (!conversation)
      return res.status(200).json({ success: true, messages: [] });
    
    return res
      .status(200)
      .json({ success: true, messages: conversation?.messages });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const markMessagesAsRead = async (req, res) => {
  try {
    const userId = req.id;
    const senderId = req.params.id;
    
    // Find all unread messages from the sender to the current user
    const unreadMessages = await Message.find({
      senderId: senderId,
      receiverId: userId,
      isRead: false
    });
    
    if (unreadMessages.length === 0) {
      return res.status(200).json({ success: true, message: "No unread messages" });
    }
    
    // Mark all messages as read
    await Message.updateMany(
      { 
        senderId: senderId,
        receiverId: userId,
        isRead: false
      },
      { $set: { isRead: true } }
    );
    
    // Also mark related message notifications as read
    try {
      const { Notification } = await import("../models/notification.model.js");
      await Notification.updateMany(
        {
          sender: senderId,
          recipient: userId,
          type: "message",
          read: false
        },
        { $set: { read: true } }
      );
    } catch (notificationError) {
      console.error("Error updating message notifications:", notificationError);
      // Continue even if notification update fails
    }
    
    // Emit an event to notify the sender that their messages have been read
    const senderSocketId = getReceiverSocketId(senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("messagesRead", { from: userId, to: senderId });
    }
    
    return res.status(200).json({ 
      success: true, 
      message: `Marked ${unreadMessages.length} messages as read` 
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getConversations = async (req, res) => {
  try {
    const userId = req.id;
    
    // Find all conversations that the user is part of
    const conversations = await Conversation.find({
      participants: { $in: [userId] }
    }).populate({
      path: 'participants',
      select: '_id username profilePicture',
      match: { _id: { $ne: userId } } // Don't include the current user
    }).populate({
      path: 'messages',
      options: { sort: { createdAt: -1 }, limit: 1 } // Get only the most recent message
    });
    
    // Get unread message counts for each conversation
    const conversationsWithUnreadCounts = await Promise.all(
      conversations.map(async (conv) => {
        // The other participant is the first item because we filtered out the current user
        const otherParticipant = conv.participants[0];
        
        if (!otherParticipant) return null; // Skip if no other participant found
        
        // Count unread messages for this conversation
        const unreadCount = await Message.countDocuments({
          senderId: otherParticipant._id,
          receiverId: userId,
          isRead: false
        });
        
        // Get the last message (already populated as first item in messages array)
        const lastMessage = conv.messages[0] || null;
        
        return {
          _id: conv._id,
          participant: otherParticipant,
          lastMessage,
          unreadCount
        };
      })
    );
    
    // Filter out null entries and sort by latest message
    const filteredConversations = conversationsWithUnreadCounts
      .filter(Boolean)
      .sort((a, b) => {
        if (!a.lastMessage && !b.lastMessage) return 0;
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
      });
    
    return res.status(200).json({
      success: true,
      conversations: filteredConversations
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
