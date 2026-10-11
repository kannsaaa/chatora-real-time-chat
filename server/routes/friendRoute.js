const express = require("express");
const friendController = require("../controllers/friendController");

const router = express.Router();

// Friend lists & requests
router.get("/", friendController.getFriends);
router.get("/requests", friendController.getFriendRequests);
router.get("/blocked", friendController.getBlockedUsers);
router.get("/all-statuses", friendController.getAllRelationshipStatuses);
router.get("/status/:userId", friendController.getRelationshipStatus);

// Friend requests
router.post("/request/:userId", friendController.sendFriendRequest);
router.post("/request/:userId/accept", friendController.acceptFriendRequest);
router.post("/request/:userId/decline", friendController.declineFriendRequest);
router.delete("/request/:userId", friendController.cancelFriendRequest);

// Unfriend
router.delete("/:userId", friendController.unfriendUser);

// Block & Unblock
router.post("/block/:userId", friendController.blockUser);
router.delete("/block/:userId", friendController.unblockUser);

module.exports = router;
