import express from "express";
import {
  editProfile,
  followOrUnfollow,
  getFollowings,
  getProfile,
  getSuggestedUsers,
  getUserStats,
  login,
  logout,
  register,
  updateUserLocation,
  findNearbyUsers,
  searchUsers,
  getCurrentUser,
  getCurrentUserProfile,
} from "../controllers/user.controller.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import upload from "../middlewares/multer.js";
import { verifyAdmin } from "../middlewares/verifyAdmin.js";
import { User } from "../models/user.model.js";
const router = express.Router();

router.route("/register").post(register);
router.route("/login").post(login);
router.route("/logout").get(logout);
router.route("/me").get(isAuthenticated, getCurrentUser);
router.route("/:id/profile").get(isAuthenticated, getProfile);
router
  .route("/profile/edit")
  .post(isAuthenticated, upload.single("profilePhoto"), editProfile);
router.route("/suggested").get(isAuthenticated, getSuggestedUsers);
router.route("/followorunfollow/:id").post(isAuthenticated, followOrUnfollow);
router.route("/followings").get(isAuthenticated, getFollowings);
router.route("/stats/:id").get(isAuthenticated, getUserStats);
router.post("/location", isAuthenticated, updateUserLocation);
router.get("/nearby", isAuthenticated, findNearbyUsers);
router.get("/search", isAuthenticated, searchUsers);
router.get("/profile", isAuthenticated, getCurrentUserProfile);

// Route to check if user is admin
router.route("/check-admin").get(isAuthenticated, (req, res) => {
  try {
    console.log("Admin check requested by:", req.user);
    console.log("User admin status from request:", req.user?.isAdmin);
    console.log("User ID in request:", req.id);
    
    const { isAdmin = false } = req.user || {};
    
    return res.status(200).json({
      success: true,
      isAdmin,
      userId: req.id,
      message: isAdmin ? "User has admin privileges" : "User does not have admin privileges"
    });
  } catch (error) {
    console.error("Admin check error:", error);
    return res.status(500).json({
      success: false,
      message: "Error checking admin status"
    });
  }
});

// Admin user management routes
router.route("/admin/users").get(isAuthenticated, verifyAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const searchQuery = req.query.q || "";
    const skip = (page - 1) * limit;

    // Build search filter
    let filter = {};
    if (searchQuery) {
      filter = {
        $or: [
          { username: { $regex: searchQuery, $options: "i" } },
          { email: { $regex: searchQuery, $options: "i" } }
        ]
      };
    }

    // Get total count for pagination
    const totalUsers = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalUsers / limit);

    // Fetch users with pagination and filtering
    const users = await User.find(filter)
      .select("username email isAdmin isBlocked profilePicture createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      users,
      pagination: {
        total: totalUsers,
        pages: totalPages,
        page,
        limit
      }
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching users",
      error: error.message
    });
  }
});

// Update user details
router.route("/admin/:userId").put(isAuthenticated, verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { username, email, isAdmin, isBlocked } = req.body;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Update user fields
    if (username) user.username = username;
    if (email) user.email = email;
    if (isAdmin !== undefined) user.isAdmin = isAdmin;
    if (isBlocked !== undefined) user.isBlocked = isBlocked;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        isBlocked: user.isBlocked
      }
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating user",
      error: error.message
    });
  }
});

// Make user admin
router.route("/admin/:userId/make-admin").put(isAuthenticated, verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Update admin status
    user.isAdmin = true;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "User promoted to admin successfully"
    });
  } catch (error) {
    console.error("Error making user admin:", error);
    return res.status(500).json({
      success: false,
      message: "Error making user admin",
      error: error.message
    });
  }
});

// Remove admin privileges
router.route("/admin/:userId/remove-admin").put(isAuthenticated, verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Update admin status
    user.isAdmin = false;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Admin privileges removed successfully"
    });
  } catch (error) {
    console.error("Error removing admin privileges:", error);
    return res.status(500).json({
      success: false,
      message: "Error removing admin privileges",
      error: error.message
    });
  }
});

// Block user
router.route("/admin/:userId/block").put(isAuthenticated, verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Update block status
    user.isBlocked = true;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "User blocked successfully"
    });
  } catch (error) {
    console.error("Error blocking user:", error);
    return res.status(500).json({
      success: false,
      message: "Error blocking user",
      error: error.message
    });
  }
});

// Unblock user
router.route("/admin/:userId/unblock").put(isAuthenticated, verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Update block status
    user.isBlocked = false;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "User unblocked successfully"
    });
  } catch (error) {
    console.error("Error unblocking user:", error);
    return res.status(500).json({
      success: false,
      message: "Error unblocking user",
      error: error.message
    });
  }
});

export default router;
