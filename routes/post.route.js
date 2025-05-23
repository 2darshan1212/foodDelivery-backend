import express from "express";
import {
  addComment,
  addNewPost,
  bookMarkPost,
  deletePost,
  dislikePost,
  getAllPost,
  getCommentsOfPost,
  getUserPost,
  likePost,
  getSinglePost,
  findNearbyPosts,
  searchPosts,
  ratePost,
  getPostRatings,
  getBookmarkedPosts
} from "../controllers/post.controller.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import upload from "../middlewares/multer.js";
const router = express.Router();

router
  .route("/addpost")
  .post(isAuthenticated, upload.single("media"), addNewPost);
router.route("/all").get(isAuthenticated, getAllPost);
router.route("/userpost/all").get(isAuthenticated, getUserPost);
router.route("/:id").get(isAuthenticated, getSinglePost);
router.route("/:id/like").get(isAuthenticated, likePost);
router.route("/:id/dislike").get(isAuthenticated, dislikePost);
router.route("/:id/comment").post(isAuthenticated, addComment);
router.route("/:id/comment/all").post(isAuthenticated, getCommentsOfPost);
router.route("/:id/bookmark").get(isAuthenticated, bookMarkPost);
router.route("/delete/:id").delete(isAuthenticated, deletePost);
router.route("/nearby").get(isAuthenticated, findNearbyPosts);
router.get("/search", isAuthenticated, searchPosts);

// Rating routes
router.route("/:id/rate").post(isAuthenticated, ratePost);
router.route("/:id/ratings").get(isAuthenticated, getPostRatings);

// Add new route for bookmarked posts
router.route("/bookmarked").get(isAuthenticated, getBookmarkedPosts);

export default router;
