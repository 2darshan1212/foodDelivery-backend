// models/Story.js
import mongoose from "mongoose";
// const mongoose = require("mongoose");

const storySchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  mediaUrl: { type: String, required: true },
  mediaType: { type: String, enum: ["video"], required: true },
  createdAt: { type: Date, default: Date.now, expires: "3h" }, // Automatically delete after 3 hours
});

export default mongoose.model("Story", storySchema);
