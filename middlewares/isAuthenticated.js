import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

const isAuthenticated = async (req, res, next) => {
  try {
    // Log received authentication data for debugging
    console.log('Auth request from:', req.headers.origin || 'unknown origin');
    console.log('Auth headers:', req.headers.authorization ? 'Present' : 'Not present');
    
    // Primarily look for token in Authorization header
    const authHeader = req.headers.authorization;
    let token;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
      console.log('Found token in Authorization header');
    } else if (req.cookies?.token) {
      // Fallback to cookies if no Authorization header
      token = req.cookies.token;
      console.log('Found token in cookies');
    }
    
    // If no token found, return 401
    if (!token) {
      console.log('No authentication token found in request');
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: "You are not authenticated"
      });
    }
    
    // Verify the token
    let decoded;
    try {
      // Use fallback secret key if environment variable isn't set
      const secretKey = process.env.SECRET_KEY || 'fallback-secret-key-for-development';
      decoded = jwt.verify(token, secretKey);
      console.log('Token verified successfully for user ID:', decoded.userId);
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError.message);
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: "Invalid or expired token"
      });
    }
    
    // Store the user ID in request object
    req.id = decoded.userId;
    
    // Fetch user from database
    const user = await User.findById(decoded.userId);
    if (!user) {
      console.error('User not found in database:', decoded.userId);
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "User not found"
      });
    }
    
    // Add user object to request
    req.user = {
      id: user._id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin || false
    };
    
    console.log('Authentication successful for user:', user.username);
    next();
  } catch (error) {
    console.error("Authentication error:", error.message);
    return res.status(401).json({
      success: false,
      statusCode: 401,
      message: "Authentication failed"
    });
  }
};

export default isAuthenticated;
