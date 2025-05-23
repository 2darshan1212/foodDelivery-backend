import mongoose from "mongoose";

const shareSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    sharedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sharedWith: {
      type: String,
      enum: ["followers", "specific", "public", "external"],
      default: "public",
    },
    recipients: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    externalPlatform: {
      type: String,
      enum: ["whatsapp", "telegram", "twitter", "facebook", "instagram", "email", "sms", "copy"],
      default: null,
    },
    message: {
      type: String,
      default: "",
    },
    shareLink: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "delivered", "viewed", "expired"],
      default: "pending",
    },
    expiresAt: {
      type: Date,
      default: function() {
        // Default expiry is 7 days from now
        const now = new Date();
        now.setDate(now.getDate() + 7);
        return now;
      },
    }
  },
  { timestamps: true }
);

// Compound index to track unique shares (one user can share a post to another user only once)
shareSchema.index({ post: 1, sharedBy: 1, recipients: 1 }, { unique: true });

// Pre-save hook to generate share link if not provided
shareSchema.pre("save", function(next) {
  if (!this.shareLink) {
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    this.shareLink = `${baseUrl}/shared/${this._id}`;
  }
  next();
});

export const Share = mongoose.model("Share", shareSchema); 