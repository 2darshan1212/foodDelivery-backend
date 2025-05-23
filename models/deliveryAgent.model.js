import mongoose from "mongoose";

const deliveryAgentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    currentLocation: {
      type: {
        type: String,
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },
    vehicleType: {
      type: String,
      enum: ["bike", "car", "scooter", "bicycle"],
      default: "bike",
    },
    vehicleNumber: {
      type: String,
    },
    activeOrders: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    }],
    deliveryHistory: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    }],
    rejectedOrders: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    }],
    rating: {
      type: Number,
      default: 0,
    },
    totalRatings: {
      type: Number,
      default: 0,
    },
    isVerified: {
      type: Boolean,
      default: false,
    }
  },
  { timestamps: true }
);

// Create a geospatial index for querying by location
deliveryAgentSchema.index({ currentLocation: "2dsphere" });

// Create a compound index for efficient lookup of agents by user ID
deliveryAgentSchema.index({ user: 1 });

export default mongoose.model("DeliveryAgent", deliveryAgentSchema); 