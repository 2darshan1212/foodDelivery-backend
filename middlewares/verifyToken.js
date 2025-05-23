import jwt from "jsonwebtoken";
import createError from "../utils/error.js";
import { User } from "../models/user.model.js";

export const verifyToken = async (req, res, next) => {
  try {
    // Get token from cookies or Authorization header
    let token = req.cookies.token;
    
    // If no token in cookies, check Authorization header
    if (!token && req.headers.authorization) {
      // Extract token from Bearer token format
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7); // Remove 'Bearer ' prefix
        console.log("Using token from Authorization header");
      }
    }
    
    // If still no token found, return unauthorized error
    if (!token) {
      console.log("No token found in cookies or headers");
      return next(createError(401, "You are not authenticated"));
    }
    
    // Verify the token
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    if (!decoded) {
      return next(createError(401, "Invalid token"));
    }
    
    // Find user by id from token
    const user = await User.findById(decoded.userId);
    if (!user) {
      return next(createError(404, "User not found"));
    }
    
    console.log(`Authenticated user: ${user.username} (${user._id})`);
    
    // Add user info to request object
    req.user = {
      id: user._id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin || false
    };
    
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    return next(createError(401, "Authentication failed"));
  }
}; 