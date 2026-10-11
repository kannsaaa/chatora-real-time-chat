const express = require("express");
const router = express.Router();
const {
  createGroup,
  getGroups,
  getGroupById,
  getGroupMessages,
  sendGroupMessageRest,
  addMembers,
  removeMember,
  leaveGroup,
  updateGroup,
} = require("../controllers/groupController");

router.post("/", createGroup);
router.get("/", getGroups);
router.get("/:groupId", getGroupById);
router.patch("/:groupId", updateGroup);
router.patch("/:groupId/name", updateGroup);
router.patch("/:groupId/avatar", updateGroup);
router.get("/:groupId/messages", getGroupMessages);
router.post("/:groupId/messages", sendGroupMessageRest);
router.post("/:groupId/members", addMembers);
router.delete("/:groupId/members/:userId", removeMember);
router.post("/:groupId/leave", leaveGroup);

module.exports = router;
