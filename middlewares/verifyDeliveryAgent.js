import DeliveryAgent from "../models/deliveryAgent.model.js";
import createError from "../utils/error.js";

export const verifyDeliveryAgent = async (req, res, next) => {
  try {
    // Make sure user is authenticated
    if (!req.user || !req.user.id) {
      return next(createError(401, "You must be logged in to perform this action"));
    }

    // Check if user is a delivery agent
    const agent = await DeliveryAgent.findOne({ user: req.user.id });
    if (!agent) {
      return next(createError(403, "You are not registered as a delivery agent"));
    }

    // Add agent to request object for easy access in controllers
    req.agent = agent;

    // User is a delivery agent, proceed to the next middleware or controller
    next();
  } catch (error) {
    console.error("Error verifying delivery agent:", error);
    return next(createError(500, "Error verifying delivery agent status"));
  }
}; 