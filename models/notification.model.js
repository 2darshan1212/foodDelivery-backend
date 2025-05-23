import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  type: {
    type: String,
    enum: ["follow", "like", "comment", "message"],
    required: true
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post"
  },
  comment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Comment"
  },
  message: {
    type: String,
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 604800 // Notifications expire after 7 days (in seconds)
  }
}, { timestamps: true });

export const Notification = mongoose.model("Notification", notificationSchema); 