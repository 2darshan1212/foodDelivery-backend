import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

const isAuthenticated = async (req, res, next) => {
  try {
    console.log('Auth headers received:', req.headers.authorization ? 'Authorization header present' : 'No Authorization header');
    console.log('Cookies received:', req.cookies?.token ? 'Token cookie present' : 'No token cookie');

    // Check for token in cookies first
    let token = req.cookies?.token;
    
    // If no token in cookies, check Authorization header
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    
    // If still no token, return 401
    if (!token) {
      console.log('No authentication token found in request');
      return res.status(401).json({
        message: "User Not Authenticated",
        success: false,
      });
    }
    
    // Verify the token
    const decode = jwt.verify(token, process.env.SECRET_KEY);
    if (!decode) {
      return res.status(401).json({
        message: "Invalid Token",
        success: false,
      });
    }
    
    // Store the user ID in req.id for backward compatibility
    req.id = decode.userId;
    
    // Also fetch user to get admin status
    const user = await User.findById(decode.userId);
    if (!user) {
      return res.status(404).json({
        message: "User Not Found",
        success: false,
      });
    }
    
    // Add user object with admin status (like verifyToken does)
    req.user = {
      id: user._id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin || false
    };
    
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({
      message: "Authentication Failed",
      success: false,
      error: error.message
    });
  }
};

export default isAuthenticated;
