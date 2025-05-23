import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
  caption: {
    type: String,
    default: "",
  },
  mediaType: {
    type: String,
    enum: ["image", "video"],
  },
  price: {
    type: String,
    default: "",
  },
  image: {
    type: String,
    default: "",
  },
  video: {
    type: String,
    default: "",
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  quantity:{
    type: Number,
    default: 1,
  },
  comments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
    },
  ],
  shareCount: {
    type: Number,
    default: 0,
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    },
    ratings: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        },
        value: {
          type: Number,
          required: true,
          min: 1,
          max: 5
        },
        comment: {
          type: String,
          default: ""
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  ratingDistribution: {
    1: { type: Number, default: 0 },
    2: { type: Number, default: 0 },
    3: { type: Number, default: 0 },
    4: { type: Number, default: 0 },
    5: { type: Number, default: 0 }
  },
  category:{
    type: String,
    default: "All",
    enum:["Breakfast","Lunch","Dinner","Snacks","Dessert","Drinks","FastFood","Other","All"]
  },
  vegetarian: {
    type: Boolean,
    default: false
  },
  spicyLevel: {
    type: String,
    enum: ["mild", "medium", "hot", "none"],
    default: "none"
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 10800, // 3 hours in seconds (only effective if TTL removal needed)
  },
});

postSchema.index({ caption: 'text', category: 'text' });

export const Post = mongoose.model("Post", postSchema);
