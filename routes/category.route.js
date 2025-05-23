import express from "express";
import { Category } from "../models/category.model.js";
import { Product } from "../models/product.model.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { verifyAdmin } from "../middlewares/verifyAdmin.js";
import upload from "../middlewares/multer.js";
import { v2 as cloudinary } from "cloudinary";

const router = express.Router();

// Get all categories with product counts
router.route("/all").get(async (req, res) => {
  try {
    // Fetch all categories
    const categories = await Category.find().sort({ name: 1 });
    
    // Get product counts for each category
    const categoriesWithProductCount = await Promise.all(
      categories.map(async (category) => {
        const productCount = await Product.countDocuments({ category: category._id });
        return {
          _id: category._id,
          name: category.name,
          description: category.description,
          image: category.image,
          productCount
        };
      })
    );
    
    return res.status(200).json({
      success: true,
      message: "Categories fetched successfully",
      categories: categoriesWithProductCount
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching categories",
      error: error.message
    });
  }
});

// Get category by ID
router.route("/:id").get(async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }
    
    return res.status(200).json({
      success: true,
      message: "Category fetched successfully",
      category
    });
  } catch (error) {
    console.error("Error fetching category:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching category",
      error: error.message
    });
  }
});

// Create new category (admin only)
router.route("/create").post(
  isAuthenticated,
  verifyAdmin,
  upload.single("categoryImage"),
  async (req, res) => {
    try {
      const { name, description } = req.body;
      
      // Check if category already exists
      const existingCategory = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: "Category with this name already exists"
        });
      }
      
      // Create category object
      const categoryData = {
        name,
        description
      };
      
      // Upload image to cloudinary if provided
      if (req.file) {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "categories"
        });
        
        categoryData.image = result.secure_url;
      }
      
      // Save category to database
      const category = await Category.create(categoryData);
      
      return res.status(201).json({
        success: true,
        message: "Category created successfully",
        category
      });
    } catch (error) {
      console.error("Error creating category:", error);
      return res.status(500).json({
        success: false,
        message: "Error creating category",
        error: error.message
      });
    }
  }
);

// Update category (admin only)
router.route("/:id").put(
  isAuthenticated,
  verifyAdmin,
  upload.single("categoryImage"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description } = req.body;
      
      // Check if category exists
      const category = await Category.findById(id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found"
        });
      }
      
      // Check if name already exists (excluding current category)
      if (name && name !== category.name) {
        const existingCategory = await Category.findOne({
          _id: { $ne: id },
          name: { $regex: new RegExp(`^${name}$`, "i") }
        });
        
        if (existingCategory) {
          return res.status(400).json({
            success: false,
            message: "Category with this name already exists"
          });
        }
      }
      
      // Update category fields
      if (name) category.name = name;
      if (description !== undefined) category.description = description;
      
      // Upload image to cloudinary if provided
      if (req.file) {
        // Delete old image if exists
        if (category.image) {
          // Extract public_id from URL
          const publicId = category.image.split('/').pop().split('.')[0];
          if (publicId) {
            try {
              await cloudinary.uploader.destroy(`categories/${publicId}`);
            } catch (err) {
              console.error("Error deleting old image:", err);
            }
          }
        }
        
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "categories"
        });
        
        category.image = result.secure_url;
      }
      
      // Save updated category
      await category.save();
      
      return res.status(200).json({
        success: true,
        message: "Category updated successfully",
        category
      });
    } catch (error) {
      console.error("Error updating category:", error);
      return res.status(500).json({
        success: false,
        message: "Error updating category",
        error: error.message
      });
    }
  }
);

// Delete category (admin only)
router.route("/:id").delete(
  isAuthenticated,
  verifyAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if category exists
      const category = await Category.findById(id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found"
        });
      }
      
      // Check if products are using this category
      const productsCount = await Product.countDocuments({ category: id });
      if (productsCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete category: ${productsCount} products are using this category`,
          productsCount
        });
      }
      
      // Delete image from cloudinary if exists
      if (category.image) {
        // Extract public_id from URL
        const publicId = category.image.split('/').pop().split('.')[0];
        if (publicId) {
          try {
            await cloudinary.uploader.destroy(`categories/${publicId}`);
          } catch (err) {
            console.error("Error deleting image:", err);
          }
        }
      }
      
      // Delete category
      await Category.findByIdAndDelete(id);
      
      return res.status(200).json({
        success: true,
        message: "Category deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting category:", error);
      return res.status(500).json({
        success: false,
        message: "Error deleting category",
        error: error.message
      });
    }
  }
);

export default router; 