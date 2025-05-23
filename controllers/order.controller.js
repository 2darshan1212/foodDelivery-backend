import Order from "../models/order.model.js";
import { User } from "../models/user.model.js";
import { Post } from "../models/post.model.js";
import createError from "../utils/error.js";

// Create a new order
export const createOrder = async (req, res, next) => {
  try {
    console.log("Order creation request received:", req.body);
    
    const {
      items,
      deliveryAddress,
      deliveryMethod,
      paymentMethod,
      deliveryInstructions,
      contactNumber,
      subtotal,
      tax,
      deliveryFee,
      discount,
      total,
      promoCodeApplied,
      pickupCoordinates, // [longitude, latitude]
      deliveryCoordinates // [longitude, latitude]
    } = req.body;

    // Validate required fields
    if (!items || items.length === 0) {
      return next(createError(400, "Order must contain items"));
    }

    if (!deliveryAddress) {
      return next(createError(400, "Delivery address is required"));
    }

    if (!contactNumber) {
      return next(createError(400, "Contact number is required"));
    }
    
    // Validate items array
    for (const item of items) {
      if (!item.productId) {
        return next(createError(400, "Each item must have a product ID"));
      }
      
      if (!item.quantity || item.quantity <= 0) {
        return next(createError(400, "Each item must have a valid quantity"));
      }
      
      // Verify product exists but allow any quantity
      try {
        const product = await Post.findById(item.productId);
        if (!product) {
          return next(createError(404, `Product not found: ${item.productId}`));
        }
        
        // Always allow ordering any quantity, regardless of available stock
        // Removed the stock quantity check that was here
      } catch (err) {
        console.error("Error checking product:", err);
        return next(createError(500, "Error validating product availability"));
      }
    }

    // Prepare pickup and delivery locations
    const pickupLocation = {
      type: "Point",
      coordinates: pickupCoordinates || [0, 0] // Default to [0,0] if not provided
    };
    
    const deliveryLocation = {
      type: "Point",
      coordinates: deliveryCoordinates || [0, 0] // Default to [0,0] if not provided
    };
    
    // Create initial status history entry
    const statusHistory = [{
      status: 'processing',
      timestamp: new Date(),
      note: 'Order received'
    }];

    // Create the order with a default status of 'processing'
    const newOrder = new Order({
      user: req.user.id,
      items,
      deliveryAddress,
      pickupLocation,
      deliveryLocation,
      deliveryMethod,
      deliveryInstructions,
      contactNumber,
      subtotal,
      tax,
      deliveryFee,
      discount,
      total,
      promoCodeApplied,
      status: 'processing',
      paymentMethod,
      paymentStatus: paymentMethod === 'cash' ? 'pending' : 'paid',
      statusHistory
    });

    // Save the order
    const savedOrder = await newOrder.save();
    console.log("Order saved successfully:", savedOrder._id);

    // Update product stock/inventory but don't enforce quantity limits
    for (const item of items) {
      // Get current product
      const product = await Post.findById(item.productId);
      
      // Update the quantity, ensuring it doesn't go below 1
      // This ensures the product always stays in stock
      let newQuantity = product.quantity - item.quantity;
      if (newQuantity < 1) newQuantity = 1;
      
      // Update available quantity in post
      await Post.findByIdAndUpdate(
        item.productId,
        { quantity: newQuantity },
        { new: true }
      );
    }

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order: savedOrder
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return next(createError(500, "Error creating order: " + error.message));
  }
};

// Get orders for current user
export const getUserOrders = async (req, res, next) => {
  try {
    console.log(`Fetching orders for user: ${req.user.username} (ID: ${req.user.id})`);
    
    // Make sure we have a valid user ID
    if (!req.user || !req.user.id) {
      console.error("No authenticated user found in request");
      return next(createError(401, "Authentication required"));
    }
    
    // Find orders for this specific user only
    const orders = await Order.find({ user: req.user.id })
      .sort({ createdAt: -1 }) // Sort by newest first
      .populate({ 
        path: 'items.productId',
        select: 'caption image price category vegetarian'
      });
      
    console.log(`Found ${orders.length} orders for user ${req.user.id}`);

    // Format orders for response
    const formattedOrders = orders.map(order => {
      // Combine order data with product details
      const formattedItems = order.items.map(item => {
        const product = item.productId; 
        return {
          productId: product?._id || item.productId,
          name: product?.caption || item.name,
          price: item.price,
          quantity: item.quantity,
          image: product?.image || null
        };
      });

      return {
        _id: order._id,
        user: order.user, // Include user ID so frontend can verify
        items: formattedItems,
        deliveryAddress: order.deliveryAddress,
        deliveryMethod: order.deliveryMethod,
        paymentMethod: order.paymentMethod,
        deliveryInstructions: order.deliveryInstructions,
        contactNumber: order.contactNumber,
        subtotal: order.subtotal,
        tax: order.tax,
        deliveryFee: order.deliveryFee,
        discount: order.discount,
        total: order.total,
        promoCodeApplied: order.promoCodeApplied,
        status: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      };
    });

    return res.status(200).json({
      success: true,
      message: "Orders fetched successfully",
      count: formattedOrders.length,
      userId: req.user.id,
      orders: formattedOrders
    });
  } catch (error) {
    console.error("Error fetching user orders:", error);
    return next(createError(500, "Error fetching orders"));
  }
};

// Get order by ID
export const getOrderById = async (req, res, next) => {
  try {
    const orderId = req.params.id;

    // Make sure order exists and belongs to current user
    const order = await Order.findById(orderId)
      .populate({
        path: 'items.productId',
        select: 'caption image price category vegetarian'
      })
      .populate({
        path: 'deliveryAgent',
        select: 'vehicleType vehicleNumber currentLocation',
        populate: {
          path: 'user',
          select: 'username avatar' 
        }
      });

    if (!order) {
      return next(createError(404, "Order not found"));
    }

    // Check if the order belongs to the user or if user is admin
    if (order.user.toString() !== req.user.id && !req.user.isAdmin) {
      return next(createError(403, "You are not authorized to access this order"));
    }

    // Format order items with product details
    const formattedItems = order.items.map(item => {
      const product = item.productId;
      return {
        productId: product?._id || item.productId,
        name: product?.caption || item.name,
        price: item.price,
        quantity: item.quantity,
        image: product?.image || null
      };
    });

    // Format delivery agent info if present
    let deliveryAgentInfo = null;
    if (order.deliveryAgent) {
      deliveryAgentInfo = {
        id: order.deliveryAgent._id,
        name: order.deliveryAgent.user?.username || 'Delivery Agent',
        avatar: order.deliveryAgent.user?.avatar || null,
        vehicleType: order.deliveryAgent.vehicleType,
        vehicleNumber: order.deliveryAgent.vehicleNumber,
        currentLocation: order.deliveryAgent.currentLocation
      };
    }

    // Get the latest status history entry
    const latestStatus = order.statusHistory && order.statusHistory.length > 0
      ? order.statusHistory[order.statusHistory.length - 1]
      : null;

    const formattedOrder = {
      _id: order._id,
      items: formattedItems,
      deliveryAddress: order.deliveryAddress,
      deliveryMethod: order.deliveryMethod,
      paymentMethod: order.paymentMethod,
      deliveryInstructions: order.deliveryInstructions,
      contactNumber: order.contactNumber,
      subtotal: order.subtotal,
      tax: order.tax,
      deliveryFee: order.deliveryFee,
      discount: order.discount,
      total: order.total,
      promoCodeApplied: order.promoCodeApplied,
      status: order.status,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      deliveryLocation: order.deliveryLocation,
      pickupLocation: order.pickupLocation,
      estimatedDeliveryTime: order.estimatedDeliveryTime,
      actualDeliveryTime: order.actualDeliveryTime,
      deliveryAgent: deliveryAgentInfo,
      statusHistory: order.statusHistory || [],
      latestStatus: latestStatus
    };

    return res.status(200).json({
      success: true,
      message: "Order fetched successfully",
      order: formattedOrder
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    return next(createError(500, "Error fetching order"));
  }
};

// Cancel an order
export const cancelOrder = async (req, res, next) => {
  try {
    const orderId = req.params.id;

    // Find the order
    const order = await Order.findById(orderId);

    if (!order) {
      return next(createError(404, "Order not found"));
    }

    // Check if the order belongs to the user
    if (order.user.toString() !== req.user.id) {
      return next(createError(403, "You are not authorized to cancel this order"));
    }

    // Check if the order is in a cancellable state
    if (['delivered', 'cancelled'].includes(order.status)) {
      return next(createError(400, `Can't cancel an order that is already ${order.status}`));
    }

    // Update order status
    order.status = 'cancelled';
    await order.save();

    // Restore product inventory
    for (const item of order.items) {
      // Update post quantity (add back to inventory)
      await Post.findByIdAndUpdate(
        item.productId,
        { $inc: { quantity: item.quantity } },
        { new: true }
      );
    }

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      order
    });
  } catch (error) {
    console.error("Error cancelling order:", error);
    return next(createError(500, "Error cancelling order"));
  }
};

// Reorder (create a new order from an existing one)
export const reorder = async (req, res, next) => {
  try {
    const orderId = req.params.id;

    // Find the original order
    const originalOrder = await Order.findById(orderId);

    if (!originalOrder) {
      return next(createError(404, "Original order not found"));
    }

    // Check if the order belongs to the user
    if (originalOrder.user.toString() !== req.user.id) {
      return next(createError(403, "You are not authorized to reorder this order"));
    }

    // Create a new order with the same details
    const newOrder = new Order({
      user: req.user.id,
      items: originalOrder.items,
      deliveryAddress: originalOrder.deliveryAddress,
      deliveryMethod: originalOrder.deliveryMethod,
      paymentMethod: originalOrder.paymentMethod,
      deliveryInstructions: originalOrder.deliveryInstructions,
      contactNumber: originalOrder.contactNumber,
      subtotal: originalOrder.subtotal,
      tax: originalOrder.tax,
      deliveryFee: originalOrder.deliveryFee,
      discount: 0, // No discount for reorders
      total: originalOrder.subtotal + originalOrder.tax + originalOrder.deliveryFee, // Recalculate total without discount
      status: 'processing',
      paymentStatus: originalOrder.paymentMethod === 'cash' ? 'pending' : 'paid'
    });

    // Save the new order
    const savedOrder = await newOrder.save();

    // Update product stock/inventory
    for (const item of originalOrder.items) {
      // Update available quantity in post
      await Post.findByIdAndUpdate(
        item.productId,
        { $inc: { quantity: -item.quantity } },
        { new: true }
      );
    }

    return res.status(201).json({
      success: true,
      message: "Order reordered successfully",
      order: savedOrder
    });
  } catch (error) {
    console.error("Error reordering:", error);
    return next(createError(500, "Error reordering"));
  }
};

// Admin: Get all orders
export const getAllOrders = async (req, res, next) => {
  try {
    // Parse pagination params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Parse filter params
    const status = req.query.status;
    const search = req.query.search;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    
    // Build filter object
    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    // Add search functionality
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      
      // Search in user's name/username/email if populated
      const usersWithMatchingName = await User.find({
        $or: [
          { name: searchRegex },
          { username: searchRegex },
          { email: searchRegex }
        ]
      }).select('_id');
      
      const userIds = usersWithMatchingName.map(user => user._id);
      
      // Build the search filter
      filter.$or = [
        { _id: search.length >= 24 ? search : null }, // Match by exact ID if valid MongoDB ID format
        { user: { $in: userIds } },                   // Match by user
        { 'items.name': searchRegex },                // Match by item name
        { contactNumber: searchRegex },               // Match by contact number
        { deliveryAddress: searchRegex }              // Match in address
      ];
    }
    
    // Count total orders matching the filter
    const totalOrders = await Order.countDocuments(filter);
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder;
    
    // Query orders with pagination, sorting, and filtering
    const orders = await Order.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('user', 'username email profilePicture name')
      .populate({
        path: 'items.productId',
        select: 'caption image price category'
      });
    
    // Calculate pagination info
    const totalPages = Math.ceil(totalOrders / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    return res.status(200).json({
      success: true,
      message: "Orders fetched successfully",
      pagination: {
        totalOrders,
        totalPages,
        currentPage: page,
        limit,
        hasNextPage,
        hasPrevPage
      },
      orders
    });
  } catch (error) {
    console.error("Error fetching all orders:", error);
    return next(createError(500, "Error fetching orders"));
  }
};

// Admin: Update order status
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;
    
    // Validate status value
    const validStatuses = ['processing', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return next(createError(400, "Invalid status value"));
    }
    
    // Find the order
    const order = await Order.findById(id);
    if (!order) {
      return next(createError(404, "Order not found"));
    }
    
    // Update status
    const oldStatus = order.status;
    order.status = status;
    
    // Add status change to history
    order.statusHistory.push({
      status,
      timestamp: new Date(),
      note: note || `Status changed from ${oldStatus} to ${status}`
    });
    
    // Additional processing based on status
    switch (status) {
      case 'confirmed':
        // Notify customer that order is confirmed
        break;
      case 'preparing':
        // Notify customer that order is being prepared
        break;
      case 'out_for_delivery':
        // If no delivery agent assigned yet, this is just a status change
        // Agent assignment is handled in the assignOrderAgent function
        break;
      case 'delivered':
        order.actualDeliveryTime = new Date();
        break;
      case 'cancelled':
        // Handle refund process if needed
        if (order.paymentStatus === 'paid') {
          order.paymentStatus = 'refunded';
        }
        break;
      default:
        // No additional processing needed
        break;
    }
    
    // Save the updated order
    await order.save();
    
    // Notify user about order status change via socket
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${order.user}`).emit("orderStatusUpdate", {
        orderId: order._id,
        status: order.status,
        timestamp: new Date()
      });
    }
    
    return res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      order
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    return next(createError(500, "Error updating order status: " + error.message));
  }
};

// Admin: Get order statistics
export const getOrderStats = async (req, res, next) => {
  try {
    // Get total count by status
    const statusCounts = await Order.aggregate([
      { 
        $group: { 
          _id: "$status", 
          count: { $sum: 1 },
          revenue: { $sum: "$total" }
        } 
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Get total count by payment status
    const paymentStatusCounts = await Order.aggregate([
      { 
        $group: { 
          _id: "$paymentStatus", 
          count: { $sum: 1 },
          amount: { $sum: "$total" }
        } 
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Get daily order count for the past 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const dailyOrders = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
          revenue: { $sum: "$total" }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Format the data for easier consumption
    const formattedStatusCounts = statusCounts.reduce((acc, curr) => {
      acc[curr._id] = { count: curr.count, revenue: curr.revenue };
      return acc;
    }, {});
    
    const formattedPaymentStatusCounts = paymentStatusCounts.reduce((acc, curr) => {
      acc[curr._id] = { count: curr.count, amount: curr.amount };
      return acc;
    }, {});
    
    // Calculate total orders and revenue
    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([
      { $group: { _id: null, total: { $sum: "$total" } } }
    ]);
    
    return res.status(200).json({
      success: true,
      message: "Order statistics fetched successfully",
      stats: {
        totalOrders,
        totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
        byStatus: formattedStatusCounts,
        byPaymentStatus: formattedPaymentStatusCounts,
        dailyOrders
      }
    });
  } catch (error) {
    console.error("Error fetching order statistics:", error);
    return next(createError(500, "Error fetching order statistics"));
  }
};

// Admin: Get order status history
export const getOrderStatusHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Validate input
    if (!id) {
      return next(createError(400, "Order ID is required"));
    }
    
    // Find the order
    const order = await Order.findById(id);
    
    if (!order) {
      return next(createError(404, "Order not found"));
    }
    
    // For now, we'll create a mock status history since the model doesn't track it
    // In a real application, you would have a separate collection for status history
    
    const mockStatusHistory = [
      {
        status: 'processing',
        timestamp: new Date(order.createdAt),
        notes: 'Order received'
      }
    ];
    
    // Add additional statuses based on order's current status
    const statusFlow = ['processing', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'];
    const currentStatusIndex = statusFlow.indexOf(order.status);
    
    // If order is cancelled, add only the cancelled status
    if (order.status === 'cancelled') {
      mockStatusHistory.push({
        status: 'cancelled',
        timestamp: new Date(order.updatedAt),
        notes: 'Order was cancelled'
      });
    } else {
      // Add history entries for each status up to the current one
      for (let i = 1; i <= currentStatusIndex; i++) {
        const timeOffset = i * 30 * 60000; // 30 minutes between statuses
        mockStatusHistory.push({
          status: statusFlow[i],
          timestamp: new Date(new Date(order.createdAt).getTime() + timeOffset),
          notes: `Status updated to ${statusFlow[i]}`
        });
      }
    }
    
    return res.status(200).json({
      success: true,
      message: "Status history fetched successfully",
      statusHistory: mockStatusHistory
    });
  } catch (error) {
    console.error("Error fetching status history:", error);
    return next(createError(500, "Error fetching status history"));
  }
};

// Admin: Assign delivery agent to an order
export const assignOrderAgent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { agentId } = req.body;
    
    // Validate input
    if (!id) {
      return next(createError(400, "Order ID is required"));
    }
    
    if (!agentId) {
      return next(createError(400, "Agent ID is required"));
    }
    
    // Find the order
    const order = await Order.findById(id);
    
    if (!order) {
      return next(createError(404, "Order not found"));
    }
    
    // In a real application, you would verify that the agent exists
    // and is available for delivery
    
    // For now, we'll just create a mock agent object
    const mockAgent = {
      id: agentId,
      name: agentId === 'agent1' ? 'John Doe' : 
            agentId === 'agent2' ? 'Jane Smith' : 'Mike Johnson'
    };
    
    // Update the order with the delivery agent info
    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      {
        $set: {
          deliveryAgent: mockAgent,
          // Also update status to out_for_delivery if it's not already delivered or cancelled
          status: (order.status !== 'delivered' && order.status !== 'cancelled') ? 'out_for_delivery' : order.status
        }
      },
      { new: true }
    )
    .populate('user', 'username email profilePicture')
    .populate({
      path: 'items.productId',
      select: 'caption image price category'
    });
    
    return res.status(200).json({
      success: true,
      message: "Delivery agent assigned successfully",
      order: updatedOrder
    });
  } catch (error) {
    console.error("Error assigning delivery agent:", error);
    return next(createError(500, "Error assigning delivery agent"));
  }
}; 