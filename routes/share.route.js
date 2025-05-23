import express from "express";
import {
  createShare,
  getMyShares,
  getSharesWithMe,
  getShareById,
  markShareAsViewed,
  deleteShare,
  getShareStats
} from "../controllers/share.controller.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";

const router = express.Router();

// Create a new share
router.post("/create", isAuthenticated, createShare);

// Get shares created by the current user
router.get("/my-shares", isAuthenticated, getMyShares);

// Get shares shared with the current user
router.get("/shared-with-me", isAuthenticated, getSharesWithMe);

// Get share statistics for a post
router.get("/stats/:postId", isAuthenticated, getShareStats);

// Get a specific share by ID
router.get("/:shareId", isAuthenticated, getShareById);

// Mark share as viewed
router.put("/:shareId/view", isAuthenticated, markShareAsViewed);

// Delete a share
router.delete("/:shareId", isAuthenticated, deleteShare);

export default router; 