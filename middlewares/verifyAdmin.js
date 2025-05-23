import { User } from "../models/user.model.js";
import createError from "../utils/error.js";

/**
 * Middleware to verify if the authenticated user is an admin
 * This should be used after the verifyToken middleware
 */
export const verifyAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(createError(401, "Authentication required"));
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return next(createError(404, "User not found"));
    }
    
    // Check if user has admin role
    if (!user.isAdmin) {
      return next(createError(403, "Admin privileges required"));
    }
    
    // If user is admin, proceed to the next middleware
    next();
  } catch (error) {
    console.error("Admin verification error:", error);
    return next(createError(500, "Admin verification failed"));
  }
}; 