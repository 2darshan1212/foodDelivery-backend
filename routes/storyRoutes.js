// routes/storyRoutes.js
import express from "express";
import multer from "multer";
import cloudinary from "../cloudinaryConfig.js";
import Story from "../models/Story.model.js";
import { User } from "../models/user.model.js";
const router = express.Router();
import isAuthenticated from "../middlewares/isAuthenticated.js";

// Configure multer for file uploads
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // Limit file size to 50MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Not a video file!"), false);
    }
  },
});

// Upload Story
router.post(
  "/upload",

  upload.single("media"),
  async (req, res) => {
    try {
      const videoFile = req.file;
      const authorId = req.body.authorId;

      //
      // Upload to Cloudinary
      cloudinary.uploader
        .upload_stream(
          { resource_type: "video", timeout: 60000, chunk_size: 60000000 },
          async (error, result) => {
            if (error) {
              return res
                .status(500)
                .json({ error: "Failed to upload video to Cloudinary" });
            }

            const newStory = Story.create({
              author: authorId,
              mediaUrl: result.secure_url,
              mediaType: "video",
            });

            const user = await User.findById(authorId);
            console.log(authorId);
            if (user) {
              user.shorts.push(newStory._id);
              await user.save();
            }

            console.log(newStory);
            res.status(201).json({
              message: "New Short Added",
              newStory,
              success: true,
            });
          }
        )
        .end(videoFile.buffer);
    } catch (error) {
      res.status(500).json({ message: "Error uploading story" });
    }
  }
);

// Get All Stories
router.get("/", async (req, res) => {
  try {
    const shorts = await Story.find()
      .sort({ createdAt: -1 })
      .populate({ path: "author", select: "username profilePicture" });
    console.log(shorts);

    res.json({
      shorts,
      success: true,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching stories" });
  }
});

export default router;
