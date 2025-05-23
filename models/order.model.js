import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Post",
          required: true,
        },
        name: {
          type: String,
        },
        price: {
          type: Number,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
      },
    ],
    deliveryAddress: {
      type: String,
      required: true,
    },
    deliveryLocation: {
      type: {
        type: String,
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },
    pickupLocation: {
      type: {
        type: String,
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },
    deliveryMethod: {
      type: String,
      enum: ["standard", "express", "pickup"],
      default: "standard",
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "wallet"],
      default: "cash",
    },
    deliveryInstructions: {
      type: String,
    },
    contactNumber: {
      type: String,
      required: true,
    },
    subtotal: {
      type: Number,
      required: true,
    },
    tax: {
      type: Number,
      required: true,
    },
    deliveryFee: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
    },
    promoCodeApplied: {
      type: String,
    },
    status: {
      type: String,
      enum: ["processing", "confirmed", "preparing", "out_for_delivery", "delivered", "cancelled"],
      default: "processing",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    deliveryAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryAgent",
    },
    estimatedDeliveryTime: {
      type: Date,
    },
    actualDeliveryTime: {
      type: Date,
    },
    statusHistory: [
      {
        status: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        location: {
          type: {
            type: String,
            default: "Point",
          },
          coordinates: {
            type: [Number], // [longitude, latitude]
            default: [0, 0],
          },
        },
        note: String,
      },
    ],
  },
  { timestamps: true }
);

// Create geospatial indexes for location-based queries
orderSchema.index({ deliveryLocation: "2dsphere" });
orderSchema.index({ pickupLocation: "2dsphere" });

export default mongoose.model("Order", orderSchema); 