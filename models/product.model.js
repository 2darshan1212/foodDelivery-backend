import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: 0,
    },
    image: {
      type: String,
      required: [true, "Product image is required"],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Product category is required"],
    },
    inStock: {
      type: Boolean,
      default: true,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    tags: [{
      type: String,
      trim: true
    }],
    discount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    availableQuantity: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true,
  }
);

// Create a text index for searching
productSchema.index({
  name: 'text',
  description: 'text',
  'tags': 'text'
});

export const Product = mongoose.model("Product", productSchema); 