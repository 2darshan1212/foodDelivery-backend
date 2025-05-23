import express from "express";

import isAuthenticated from "../middlewares/isAuthenticated.js";
import { sendMessage, getMessage, markMessagesAsRead, getConversations } from "../controllers/messsage.controller.js";
import { upload } from "../middlewares/fileUpload.js";

const router = express.Router();

router.route("/send/:id").post(isAuthenticated, upload.single('file'), sendMessage);
router.route("/all/:id").get(isAuthenticated, getMessage);
router.route("/read/:id").put(isAuthenticated, markMessagesAsRead);
router.route("/conversations").get(isAuthenticated, getConversations);

export default router;
