import mongoose from 'mongoose';
import Order from '../models/order.model.js';
import { io } from '../socket/socket.js';

// Global variable to store the change stream reference
let orderChangeStream = null;

/**
 * Function to create and set up the change stream
 */
const createOrderChangeStream = () => {
  try {
    // Close existing stream if it exists
    if (orderChangeStream) {
      console.log('Closing existing change stream');
      orderChangeStream.close();
    }

    console.log('Creating new order change stream...');
    
    // Create a new change stream
    orderChangeStream = Order.watch(
      [
        { $match: { "operationType": { $in: ["update", "insert", "replace"] } } }
      ],
      { 
        fullDocument: "updateLookup",
        // Add a resume token to help with resuming after errors
        resumeAfter: null
      }
    );

    // Set up event handlers
    orderChangeStream.on('change', async (change) => {
      try {
        if (change.operationType === 'update' || change.operationType === 'insert' || change.operationType === 'replace') {
          const order = change.fullDocument;
          
          if (order) {
            console.log(`Order ${order._id} changed: ${order.status}`);
            
            // Broadcast to specific order room
            io.to(`order_${order._id}`).emit('orderUpdate', {
              orderId: order._id,
              status: order.status,
              updatedAt: order.updatedAt,
              latestStatus: order.statusHistory && order.statusHistory.length > 0 
                ? order.statusHistory[order.statusHistory.length - 1]
                : null
            });
            
            // Broadcast to user
            io.to(`user_${order.user}`).emit('orderUpdate', {
              orderId: order._id,
              status: order.status,
              updatedAt: order.updatedAt
            });
            
            // Broadcast to delivery agent if assigned
            if (order.deliveryAgent) {
              io.to(`agent_${order.deliveryAgent}`).emit('orderUpdate', {
                orderId: order._id,
                status: order.status,
                updatedAt: order.updatedAt
              });
            }
          }
        }
      } catch (error) {
        console.error('Error processing order change stream event:', error);
      }
    });

    orderChangeStream.on('error', (error) => {
      console.error('Change stream error:', error);
      // Wait a bit and then try to recreate the stream
      setTimeout(() => {
        console.log('Attempting to reconnect change stream after error...');
        createOrderChangeStream();
      }, 5000);
    });

    orderChangeStream.on('close', () => {
      console.log('Change stream closed');
      // Only reconnect if not intentionally closed
      if (mongoose.connection.readyState === 1) {
        console.log('Connection is still open, reconnecting change stream...');
        setTimeout(createOrderChangeStream, 5000);
      }
    });
    
    console.log('Order change stream setup complete');
    return true;
  } catch (error) {
    console.error('Error creating order change stream:', error);
    // Try to reconnect after a delay
    setTimeout(createOrderChangeStream, 5000);
    return false;
  }
};

/**
 * Set up MongoDB Change Streams to track and broadcast order status changes
 */
export const setupChangeStreams = async () => {
  try {
    console.log('Setting up MongoDB Change Streams...');
    
    // Set up connection event handlers
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected, will attempt to reconnect');
      // When connection is restored, the 'connected' event will fire
    });
    
    mongoose.connection.on('connected', () => {
      console.log('MongoDB connected, setting up change streams');
      createOrderChangeStream();
    });
    
    // Initial setup if already connected
    if (mongoose.connection.readyState === 1) {
      createOrderChangeStream();
      console.log('MongoDB Change Streams set up successfully');
    }
    
    return true;
  } catch (error) {
    console.error('Error setting up MongoDB Change Streams:', error);
    return false;
  }
};

/**
 * Safely close change streams when shutting down
 */
export const closeChangeStreams = async () => {
  if (orderChangeStream) {
    console.log('Closing order change stream');
    await orderChangeStream.close();
    orderChangeStream = null;
  }
};