import sharp from "sharp";
import cloudinary from "../utils/cloudinary.js";
import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { Comment } from "../models/comment.model.js";
import Story from "../models/Story.model.js";
import { getReceiverSocketId, io } from "../socket/socket.js";
import streamifier from "streamifier";

// export const addNewPost = async (req, res) => {
//   try {
//     const { caption } = req.body;
//     const image = req.file;
//     const authorId = req.id;
//     if (!image) return res.status(400).json({ message: "Image Required" });

//     //image (optimization)
//     const optimizedImageBuffer = await sharp(image.buffer)
//       .resize({ width: 800, height: 800, fit: "inside" })
//       .toFormat("jpeg", { quality: 90 })
//       .toBuffer();

//     //uploading to cloudinary
//     const fileUri = `data:image/jpeg;base64,${optimizedImageBuffer.toString(
//       "base64"
//     )}`;
//     const cloudResponse = await cloudinary.uploader.upload(fileUri);
//     const post = await Post.create({
//       caption,
//       image: cloudResponse.secure_url,
//       author: authorId,
//     });

//     const user = await User.findById(authorId);
//     if (user) {
//       user.posts.push(post._id);
//       await user.save();
//     }

//     await post.populate({ path: "author", select: "-password" });

//     return res.status(201).json({
//       message: "New Post Added",
//       post,
//       success: true,
//     });
//   } catch (error) {
//     console.log(error);
//   }
// };

export const addNewPost = async (req, res) => {
  try {
    const { caption, price, category, vegetarian, spicyLevel } = req.body;
    const file = req.file;
    const mediaType = file?.mimetype.split("/")[0]; // 'image' or 'video'
    const authorId = req.id;

    if (!file) {
      return res
        .status(400)
        .json({ message: "Media Required", success: false });
    }

    let mediaUrl = null;

    if (mediaType === "image") {
      // Optimize and upload image
      const optimizedImageBuffer = await sharp(file.buffer)
        .resize({ width: 800, height: 800, fit: "inside" })
        .toFormat("jpeg", { quality: 90 })
        .toBuffer();

      const fileUri = `data:image/jpeg;base64,${optimizedImageBuffer.toString(
        "base64"
      )}`;

      const cloudResponse = await cloudinary.uploader.upload(fileUri, {
        resource_type: "image",
      });

      mediaUrl = cloudResponse.secure_url;
    } else if (mediaType === "video") {
      // Stream upload video to Cloudinary
      const streamUpload = () =>
        new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              resource_type: "video",
              timeout: 60000,
              chunk_size: 60000000,
            },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );

          streamifier.createReadStream(file.buffer).pipe(stream);
        });

      const result = await streamUpload();
      mediaUrl = result.secure_url;
    } else {
      return res
        .status(400)
        .json({ message: "Unsupported media type", success: false });
    }

    // Parse boolean flag
    const isVegetarian = vegetarian === "true" || vegetarian === true;

    // Save post to DB
    const post = await Post.create({
      caption,
      price,
      category,
      author: authorId,
      mediaType,
      image: mediaType === "image" ? mediaUrl : undefined,
      video: mediaType === "video" ? mediaUrl : undefined,
      vegetarian: isVegetarian,
      spicyLevel: spicyLevel || "none",
      // Initialize rating with default values
      rating: {
        average: 0,
        count: 0,
        ratings: []
      },
      ratingDistribution: {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0
      }
    });

    const user = await User.findById(authorId);
    if (user) {
      user.posts.push(post._id);
      await user.save();
    }

    await post.populate({ path: "author", select: "username profilePicture location" });

    return res.status(201).json({
      message: "New Post Added",
      post,
      success: true,
    });
  } catch (error) {
    console.error("Add New Post Error:", error);
    res.status(500).json({ message: "Internal Error", success: false });
  }
};

export const getAllPost = async (req, res) => {
  try {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const posts = await Post.find({ createdAt: { $gte: threeHoursAgo } })
      .sort({ createdAt: -1 })
      .populate({ path: "author", select: "username profilePicture location" })
      .populate({
        path: "comments",
        sort: { createdAt: -1 },
        populate: {
          path: "author",
          select: "username profilePicture location",
        },
      });
    return res.status(200).json({
      posts,
      success: true,
    });
  } catch (error) {
    console.error("Get all posts error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching posts: " + error.message
    });
  }
};

// export const getUserPost = async (req, res) => {
//   try {
//     const authorId = req.id;
//     const posts = await Post.find({ author: authorId })
//       .sort({ createdAt: -1 })
//       .populate({ path: "author", select: "username , profilePicture" })
//       .populate({
//         path: "comments",
//         sort: { createdAt: -1 },
//         populate: {
//           path: "author",
//           select: "username , profilePicture",
//         },
//       });
//     return res.status(200).json({
//       posts,
//       success: true,
//     });
//   } catch (error) {
//     console.log(error);
//   }
// };

export const getUserPost = async (req, res) => {
  try {
    const authorId = req.id;
    
    if (!authorId) {
      return res.status(401).json({
        success: false,
        message: "User ID not found, please login again"
      });
    }
    
    const posts = await Post.find({ author: authorId })
      .sort({ createdAt: -1 })
      .populate({ path: "author", select: "username profilePicture location" })
      .populate({
        path: "comments",
        sort: { createdAt: -1 },
        populate: {
          path: "author",
          select: "username profilePicture location",
        },
      });
      
    return res.status(200).json({
      posts,
      success: true,
    });
  } catch (error) {
    console.error("Get user posts error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching user posts: " + error.message
    });
  }
};

export const likePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const likingUserId = req.id;
    
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ 
        message: "Post Not Found", 
        success: false 
      });
    }
    
    // Check if user already liked the post
    const alreadyLiked = post.likes.includes(likingUserId);
    if (alreadyLiked) {
      return res.status(400).json({ 
        message: "You already liked this post", 
        success: false 
      });
    }
    
    // Add user to likes array
    await post.updateOne({ $addToSet: { likes: likingUserId } });
    await post.save();

    // Get post author ID
    const postOwnerId = post.author.toString();
    
    // Only create notification if post owner is not the same as the liker
    if (postOwnerId !== likingUserId) {
      // Get user details for notification
      const user = await User.findById(likingUserId).select("username profilePicture");
      
      // Create notification for database
      try {
        const { createNotification } = await import("./notification.controller.js");
        await createNotification(
          likingUserId,
          postOwnerId,
          "like",
          `${user.username} liked your post`,
          postId
        );
      } catch (notificationError) {
        console.error("Failed to create like notification:", notificationError);
        // Continue even if notification fails
      }
      
      // Real-time socket notification
      const notification = {
        type: "like",
        userId: likingUserId,
        userDetails: user,
        postId,
        message: "Your Post Was Liked",
      };
      const postOwnerSocketId = getReceiverSocketId(postOwnerId);
      if (postOwnerSocketId) {
        io.to(postOwnerSocketId).emit("notification", notification);
      }
    }

    return res.status(200).json({ 
      message: "Post Liked", 
      success: true,
      likesCount: post.likes.length + 1
    });
  } catch (error) {
    console.error("Like post error:", error);
    return res.status(500).json({
      message: "Server error while liking post",
      success: false
    });
  }
};

export const dislikePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.id;
    
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ 
        message: "Post Not Found", 
        success: false 
      });
    }
    
    // Check if user had liked the post
    const hadLiked = post.likes.includes(userId);
    if (!hadLiked) {
      return res.status(400).json({ 
        message: "You haven't liked this post yet", 
        success: false 
      });
    }
    
    // Remove user from likes array
    await post.updateOne({ $pull: { likes: userId } });
    await post.save();

    // Get post author ID
    const postOwnerId = post.author.toString();
    
    // Only send real-time notification if post owner is not the same as the user
    if (postOwnerId !== userId) {
      // Get user details for notification
      const user = await User.findById(userId).select("username profilePicture");
      
      // Real-time socket notification
      const notification = {
        type: "dislike",
        userId: userId,
        userDetails: user,
        postId,
        message: "Your Post Was Unliked",
      };
      
      const postOwnerSocketId = getReceiverSocketId(postOwnerId);
      if (postOwnerSocketId) {
        io.to(postOwnerSocketId).emit("notification", notification);
      }
    }

    return res.status(200).json({ 
      message: "Post Unliked", 
      success: true,
      likesCount: post.likes.length - 1
    });
  } catch (error) {
    console.error("Unlike post error:", error);
    return res.status(500).json({
      message: "Server error while unliking post",
      success: false
    });
  }
};

export const addComment = async (req, res) => {
  try {
    const postId = req.params.id;
    const authorId = req.id;
    const { text, parentId } = req.body;
    
    if (!text) {
      return res.status(400).json({
        message: "Comment text is required",
        success: false,
      });
    }
    
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        message: "Post Not Found",
        success: false,
      });
    }
    
    // Create new comment
    const comment = await Comment.create({
      text,
      author: authorId,
      post: postId,
      parent: parentId || null,
    });
    
    // Populate author information
    await comment.populate({
      path: "author",
      select: "username profilePicture",
    });
    
    // Update post's comments array
    post.comments.push(comment._id);
    await post.save();
    
    // Get post owner ID
    const postOwnerId = post.author.toString();
    
    // Only create notification if post owner is not the comment author
    if (postOwnerId !== authorId) {
      try {
        // Get commenter details
        const commenter = await User.findById(authorId).select("username profilePicture");
        
        // Create notification in database
        const { createNotification } = await import("./notification.controller.js");
        await createNotification(
          authorId,
          postOwnerId,
          "comment",
          `${commenter.username} commented on your post: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`,
          postId,
          comment._id
        );
        
        // Send real-time notification
        const postOwnerSocketId = getReceiverSocketId(postOwnerId);
        if (postOwnerSocketId) {
          io.to(postOwnerSocketId).emit("notification", {
            type: "comment",
            userId: authorId,
            userDetails: commenter,
            postId,
            commentId: comment._id,
            text: text.substring(0, 50),
            message: "Someone commented on your post",
          });
        }
      } catch (notificationError) {
        console.error("Failed to create comment notification:", notificationError);
        // Continue even if notification fails
      }
    }
    
    return res.status(201).json({
      message: "Comment Added",
      comment,
      success: true,
      commentsCount: post.comments.length
    });
  } catch (error) {
    console.error("Add comment error:", error);
    return res.status(500).json({
      message: "Server error while adding comment",
      success: false
    });
  }
};

export const getCommentsOfPost = async (req, res) => {
  try {
    const postId = req.params.id;
    
    if (!postId) {
      return res.status(400).json({ 
        success: false, 
        message: "Post ID is required" 
      });
    }
    
    try {
      const comments = await Comment.find({ post: postId }).populate(
        "author",
        "username profilePicture"
      );
      
      if (!comments || comments.length === 0) {
        return res.status(200).json({ 
          success: true, 
          message: "No Comments", 
          comments: [] 
        });
      }
      
      return res.status(200).json({ 
        success: true, 
        comments 
      });
    } catch (findError) {
      if (findError.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: "Invalid post ID"
        });
      }
      throw findError;
    }
  } catch (error) {
    console.error("Get comments error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching comments: " + error.message
    });
  }
};

export const deletePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const authorId = req.id;

    const post = await Post.findById(postId);
    if (!post)
      return res
        .status(404)
        .json({ message: "Post Not Found", success: false });
    //checking if the logged in user is owner of the post
    if (post.author.toString() !== authorId)
      return res.status(403).json({ message: "Unauthorised" });
    //deleting the post
    await Post.findByIdAndDelete(postId);
    // removing the post id also from user's post
    let user = await User.findById(authorId);
    user.posts = user.posts.filter((id) => id.toString() !== postId);
    await user.save();
    //deleting associated comments with the post
    await Comment.deleteMany({ post: postId });
    return res.status(200).json({
      success: true,
      message: "Post Deleted",
    });
  } catch (error) {
    console.error("Delete post error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while deleting post: " + error.message
    });
  }
};

export const bookMarkPost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.id;
    
    // Validate post ID
    if (!postId) {
      return res.status(400).json({
        message: "Post ID is required",
        success: false
      });
    }
    
    // Validate user ID
    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized. Please login again.",
        success: false
      });
    }
    
    // Find the post
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ 
        message: "Post Not Found", 
        success: false 
      });
    }
    
    // Find the user and ensure they exist
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        message: "User Not Found", 
        success: false 
      });
    }
    
    // Initialize bookmarks array if it doesn't exist
    if (!user.bookmarks) {
      user.bookmarks = [];
    }
    
    // Check if post is already bookmarked
    const isCurrentlyBookmarked = user.bookmarks.includes(post._id);
    
    console.log(`User ${userId} - Post ${postId} - Current bookmark status: ${isCurrentlyBookmarked}`);
    
    if (isCurrentlyBookmarked) {
      // Remove from bookmarks - use direct method to ensure it works
      user.bookmarks = user.bookmarks.filter(bookmark => 
        bookmark.toString() !== post._id.toString()
      );
      await user.save();
      
      console.log(`User ${userId} removed bookmark for post ${postId}, remaining bookmarks: ${user.bookmarks.length}`);
      
      return res.status(200).json({
        type: "unsaved",
        message: "Post removed from bookmarks",
        success: true,
      });
    } else {
      // Add to bookmarks - use direct method to ensure it works
      user.bookmarks.push(post._id);
      await user.save();
      
      console.log(`User ${userId} added bookmark for post ${postId}, total bookmarks: ${user.bookmarks.length}`);
      
      return res.status(200).json({ 
        type: "saved", 
        message: "Post bookmarked", 
        success: true 
      });
    }
  } catch (error) {
    console.error("Bookmark post error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while bookmarking post: " + error.message
    });
  }
};

// Add the getSinglePost controller function to get a single post by ID
export const getSinglePost = async (req, res) => {
  try {
    const postId = req.params.id;
    
    if (!postId) {
      return res.status(400).json({
        success: false,
        message: "Post ID is required",
      });
    }
    
    // Try to find the post without validation
    try {
      const post = await Post.findById(postId)
        .populate({ path: "author", select: "username profilePicture location" })
        .populate({
          path: "comments",
          sort: { createdAt: -1 },
          populate: {
            path: "author",
            select: "username profilePicture location",
          },
        });
        
      if (!post) {
        return res.status(404).json({
          success: false,
          message: "Post not found",
        });
      }
      
      return res.status(200).json({
        success: true,
        post,
      });
    } catch (findError) {
      // If the error is a CastError (invalid ID format), return a more user-friendly message
      if (findError.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: "Invalid post ID",
        });
      }
      // Otherwise rethrow the error to be caught by the outer catch block
      throw findError;
    }
  } catch (error) {
    console.error("Error fetching single post:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error: " + error.message,
    });
  }
};

export const findNearbyPosts = async (req, res) => {
  try {
    const { longitude, latitude, maxDistance = 10000 } = req.query; // maxDistance in meters

    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        message: "Longitude and latitude are required",
      });
    }

    const nearbyPosts = await Post.find({
      author: {
        $exists: true,
      },
      "author.location": {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          $maxDistance: parseInt(maxDistance),
        },
      },
    }).populate({
      path: "author",
      select: "username profilePicture location",
    });

    return res.status(200).json({
      success: true,
      posts: nearbyPosts,
    });
  } catch (error) {
    console.error("Find nearby posts error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while finding nearby posts: " + error.message,
    });
  }
};

export const searchPosts = async (req, res) => {
  try {
    const { 
      q, 
      category, 
      minPrice, 
      maxPrice, 
      rating, 
      sort, 
      vegetarian, 
      spicy,
      page = 1,
      limit = 10
    } = req.query;
    
    // Return only categories if no search parameters
    if (!q && (!category || category === 'All') && !minPrice && !maxPrice && !rating && !vegetarian && !spicy) {
      // Get all categories from enum or database
      const categories = ["Breakfast", "Lunch", "Dinner", "Snacks", "Dessert", "Drinks", "FastFood", "Vegetarian", "Other"];
      return res.status(200).json({ success: true, posts: [], categories });
    }

    // Build filter object
    const filter = {};
    
    // Text search
    if (q) {
      filter.$or = [
        { caption: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { category: { $regex: q, $options: "i" } }
      ];
    }
    
    // Category filter - supports multiple comma-separated categories
    if (category && category !== 'All') {
      const categories = category.split(',');
      if (categories.length > 1) {
        filter.category = { $in: categories };
      } else {
        filter.category = category;
      }
    }
    
    // Price range filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = Number(minPrice);
      if (maxPrice !== undefined) filter.price.$lte = Number(maxPrice);
    }
    
    // Rating filter
    if (rating) {
      filter.rating = { $gte: Number(rating) };
    }
    
    // Vegetarian filter
    if (vegetarian === 'true') {
      filter.vegetarian = true;
    }
    
    // Spicy level filter
    if (spicy && spicy !== 'any') {
      filter.spicyLevel = spicy;
    }
    
    // Pagination calculation
    const skip = (Number(page) - 1) * Number(limit);
    
    // Sorting options
    let sortOption = {};
    switch (sort) {
      case 'date':
        sortOption = { createdAt: -1 };
        break;
      case 'price_low':
        sortOption = { price: 1 };
        break;
      case 'price_high':
        sortOption = { price: -1 };
        break;
      case 'rating':
        sortOption = { rating: -1 };
        break;
      default:
        // Default relevance sort (if text search is used)
        sortOption = q ? { score: { $meta: "textScore" } } : { createdAt: -1 };
    }
    
    // Log the constructed query for debugging
    console.log("Search filter:", JSON.stringify(filter, null, 2));
    console.log("Sort option:", sortOption);
    
    // Execute query with pagination
    const [posts, totalCount] = await Promise.all([
      Post.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(Number(limit))
        .populate({ path: "author", select: "username profilePicture location" })
        .select("_id caption image video mediaType author category price rating createdAt vegetarian spicyLevel"),
      Post.countDocuments(filter)
    ]);
    
    // Get all categories for filter UI
    const categories = ["Breakfast", "Lunch", "Dinner", "Snacks", "Dessert", "Drinks", "FastFood", "Vegetarian", "Other"];
    
    // Calculate if there are more results
    const hasMore = totalCount > skip + posts.length;
    
    return res.status(200).json({ 
      success: true, 
      posts, 
      categories,
      pagination: {
        total: totalCount,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(totalCount / Number(limit))
      },
      hasMore
    });
  } catch (error) {
    console.error("Post search error:", error);
    return res.status(500).json({ success: false, message: "Server error: " + error.message });
  }
};

export const ratePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.id;
    const { rating, comment = "" } = req.body;

    // Validate input
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5"
      });
    }

    // Find the post
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found"
      });
    }

    // Initialize rating structure if it doesn't exist
    if (!post.rating) {
      post.rating = {
        average: 0,
        count: 0,
        ratings: [],
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }

    // Initialize distribution if it doesn't exist
    if (!post.rating.distribution) {
      post.rating.distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    }

    // Check if user has already rated this post
    const existingRatingIndex = post.rating.ratings.findIndex(
      r => r.user && r.user.toString() === userId
    );

    // Process the rating
    if (existingRatingIndex !== -1) {
      // Get the previous rating value to update distribution
      const previousRating = post.rating.ratings[existingRatingIndex].value;
      
      // Update existing rating
      post.rating.ratings[existingRatingIndex] = {
        user: userId,
        value: rating,
        comment,
        createdAt: new Date()
      };
      
      // Update rating distribution safely
      if (post.rating.distribution[previousRating] !== undefined) {
        post.rating.distribution[previousRating]--;
      }
      if (post.rating.distribution[rating] !== undefined) {
        post.rating.distribution[rating]++;
      } else {
        post.rating.distribution[rating] = 1;
      }
    } else {
      // Add new rating
      post.rating.ratings.push({
        user: userId,
        value: rating,
        comment,
        createdAt: new Date()
      });
      
      // Increment count and update distribution safely
      post.rating.count++;
      if (post.rating.distribution[rating] !== undefined) {
        post.rating.distribution[rating]++;
      } else {
        post.rating.distribution[rating] = 1;
      }
    }

    // Calculate new average rating
    const totalRating = post.rating.ratings.reduce((sum, item) => sum + item.value, 0);
    post.rating.average = totalRating / post.rating.ratings.length;

    // Save the post
    await post.save();

    // Get current user details for notification
    const ratingUser = await User.findById(userId).select("username profilePicture");
    
    // Notify post owner if it's not the same user
    if (post.author.toString() !== userId) {
      try {
        // Create notification in database
        const { createNotification } = await import("./notification.controller.js");
        await createNotification(
          userId,
          post.author,
          "rating",
          `${ratingUser.username} ${existingRatingIndex !== -1 ? 'updated their rating' : 'rated your post'} with ${rating} stars`,
          postId
        );
        
        // Send real-time notification
        const postOwnerSocketId = getReceiverSocketId(post.author.toString());
        if (postOwnerSocketId) {
          io.to(postOwnerSocketId).emit("notification", {
            type: "rating",
            userId,
            userDetails: ratingUser,
            postId,
            rating,
            message: `${existingRatingIndex !== -1 ? 'Updated rating' : 'New rating'}: ${rating} stars`
          });
        }
      } catch (notificationError) {
        console.error("Failed to create rating notification:", notificationError);
        // Continue even if notification fails
      }
    }

    return res.status(200).json({
      success: true,
      message: existingRatingIndex !== -1 ? "Rating updated successfully" : "Rating added successfully",
      rating: {
        average: post.rating.average,
        count: post.rating.count,
        distribution: post.rating.distribution,
        userRating: {
          value: rating,
          comment
        }
      }
    });
  } catch (error) {
    console.error("Rate post error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while rating post: " + error.message
    });
  }
};

export const getPostRatings = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.id;

    // Find the post with populated ratings
    const post = await Post.findById(postId)
      .select("rating ratingDistribution")
      .populate({
        path: "rating.ratings.user",
        select: "username profilePicture"
      });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found"
      });
    }

    // Initialize rating structure if it doesn't exist
    if (!post.rating) {
      post.rating = {
        average: 0,
        count: 0,
        ratings: [],
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
      
      // Save the initialized structure
      await post.save();
    }

    // Initialize distribution if it doesn't exist
    if (!post.rating.distribution) {
      post.rating.distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      
      // Save the initialized structure
      await post.save();
    }

    // Find the user's rating if it exists
    const userRating = post.rating.ratings.find(
      r => r.user && r.user._id && r.user._id.toString() === userId
    );

    return res.status(200).json({
      success: true,
      ratings: {
        average: post.rating.average || 0,
        count: post.rating.count || 0,
        distribution: post.rating.distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        userRating: userRating ? {
          value: userRating.value,
          comment: userRating.comment,
          createdAt: userRating.createdAt
        } : null,
        recentRatings: post.rating.ratings
          ? post.rating.ratings.sort((a, b) => b.createdAt - a.createdAt).slice(0, 10)
          : [] // Return 10 most recent ratings or empty array if no ratings
      }
    });
  } catch (error) {
    console.error("Get post ratings error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching ratings: " + error.message
    });
  }
};

// Get all bookmarked posts for current user
export const getBookmarkedPosts = async (req, res) => {
  try {
    const userId = req.id;
    
    // Validate user ID
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please login again."
      });
    }
    
    // Find the user to get their bookmarks
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    // If user has no bookmarks, return empty array
    if (!user.bookmarks || user.bookmarks.length === 0) {
      console.log(`User ${userId} has no bookmarks`);
      return res.status(200).json({
        success: true,
        posts: [],
        message: "No bookmarked posts found"
      });
    }
    
    console.log(`Fetching ${user.bookmarks.length} bookmarked posts for user ${userId}`);
    
    // Find all posts that are in the user's bookmarks
    const bookmarkedPosts = await Post.find({
      _id: { $in: user.bookmarks }
    })
    .populate({ 
      path: "author", 
      select: "username profilePicture location" 
    })
    .populate({
      path: "comments",
      sort: { createdAt: -1 },
      populate: {
        path: "author",
        select: "username profilePicture location",
      },
    });
    
    console.log(`Found ${bookmarkedPosts.length} bookmarked posts`);
    
    // Check for missing bookmarks (posts that may have been deleted)
    if (bookmarkedPosts.length < user.bookmarks.length) {
      console.log(`Some bookmarked posts were not found, cleaning up user bookmarks`);
      
      // Get IDs of posts that still exist
      const existingPostIds = bookmarkedPosts.map(post => post._id.toString());
      
      // Find bookmark IDs that no longer exist as posts
      const missingBookmarks = user.bookmarks.filter(
        bookmarkId => !existingPostIds.includes(bookmarkId.toString())
      );
      
      if (missingBookmarks.length > 0) {
        console.log(`Removing ${missingBookmarks.length} invalid bookmarks`);
        
        // Remove invalid bookmarks
        await User.updateOne(
          { _id: userId },
          { $pull: { bookmarks: { $in: missingBookmarks } } }
        );
      }
    }
    
    return res.status(200).json({
      success: true,
      posts: bookmarkedPosts
    });
  } catch (error) {
    console.error("Error fetching bookmarked posts:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching bookmarked posts: " + error.message
    });
  }
};


