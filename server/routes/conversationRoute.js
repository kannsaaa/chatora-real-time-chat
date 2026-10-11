const express = require("express");
const conversationController = require("../controllers/conversationController");
const messageController = require("../controllers/messageController");

const router = express.Router();

// GET /api/conversations
router.get("/", conversationController.getConversations);

// PATCH /api/conversations/:userId/pin
router.patch("/:userId/pin", conversationController.togglePin);

// PATCH /api/conversations/:userId/mute
router.patch("/:userId/mute", conversationController.toggleMute);

// PATCH /api/conversations/:userId/unread
router.patch("/:userId/unread", conversationController.setUnread);

// DELETE /api/conversations/:userId (re-exports existing messageController.deleteConversation)
router.delete("/:userId", messageController.deleteConversation);

module.exports = router;
