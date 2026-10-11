const mongoose = require("mongoose");
const Group = require("../models/groupModel");
const Message = require("../models/messageModel");
const ConversationPreference = require("../models/conversationPreferenceModel");
const Friendship = require("../models/friendshipModel");
const Block = require("../models/blockModel");
const { User } = require("../models/userModel");
const protect = require("../middleware/protect");
const { notifyGroupEvent, notifyGroupMessage } = require("../wsServer");

// POST /api/groups - Create a new group
const createGroup = async (req, res) => {
  try {
    let userData;
    try {
      userData = await protect(req);
    } catch {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { name, members, avatar } = req.body;
    const ourUserId = userData._id;

    // Validate group name
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "Group name is required" });
    }
    const trimmedName = name.trim();
    if (trimmedName.length > 50) {
      return res
        .status(400)
        .json({ message: "Group name cannot exceed 50 characters" });
    }

    // Validate members list
    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({
        message: "You must add at least one friend to the group",
      });
    }

    // Verify all requested members
    const validMemberIds = [];
    for (const memberId of members) {
      if (!mongoose.Types.ObjectId.isValid(memberId)) {
        return res
          .status(400)
          .json({ message: `Invalid member ID: ${memberId}` });
      }

      if (memberId.toString() === ourUserId.toString()) {
        continue; // Creator will be added automatically
      }

      const userDoc = await User.findById(memberId);
      if (!userDoc) {
        return res
          .status(404)
          .json({ message: `User not found: ${memberId}` });
      }

      // 1. Check Block relationship
      const isBlocked = await Block.findOne({
        $or: [
          { blocker: ourUserId, blocked: memberId },
          { blocker: memberId, blocked: ourUserId },
        ],
      });
      if (isBlocked) {
        return res
          .status(403)
          .json({ message: "Cannot add blocked user to group" });
      }

      // 2. Check Friendship status === ACCEPTED
      const canonicalPair = Friendship.getCanonicalPair(ourUserId, memberId);
      const friendship = await Friendship.findOne({
        canonicalPair,
        status: "ACCEPTED",
      });
      if (!friendship) {
        return res.status(403).json({
          message: "You can only add accepted friends to a group",
        });
      }

      if (!validMemberIds.some((id) => id.toString() === memberId.toString())) {
        validMemberIds.push(new mongoose.Types.ObjectId(memberId));
      }
    }

    if (validMemberIds.length === 0) {
      return res.status(400).json({
        message: "You must add at least one friend to the group",
      });
    }

    // Creator is always admin and member
    const allMembers = [new mongoose.Types.ObjectId(ourUserId), ...validMemberIds];
    const admins = [new mongoose.Types.ObjectId(ourUserId)];

    const group = await Group.create({
      name: trimmedName,
      avatar: typeof avatar === "string" ? avatar.trim() : "",
      createdBy: ourUserId,
      admins,
      members: allMembers,
    });

    await group.populate(
      "members admins createdBy",
      "firstName lastName username avatarLink bio"
    );

    // Notify all members via WebSocket
    if (typeof notifyGroupEvent === "function") {
      notifyGroupEvent(
        allMembers.map((m) => m.toString()),
        {
          type: "group_created",
          groupId: group._id,
          group,
        }
      );
    }

    return res.status(201).json(group);
  } catch (error) {
    console.error("Error in createGroup:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// GET /api/groups - Get all groups current user is a member of
const getGroups = async (req, res) => {
  try {
    let userData;
    try {
      userData = await protect(req);
    } catch {
      return res.status(401).json({ message: "Authentication required" });
    }

    const ourUserId = userData._id;

    const groups = await Group.find({ members: ourUserId })
      .populate("members admins createdBy", "firstName lastName username avatarLink bio")
      .sort({ updatedAt: -1 })
      .lean();

    // Attach latest message and preferences for each group
    const enrichedGroups = await Promise.all(
      groups.map(async (group) => {
        const latestMsg = await Message.findOne({
          group: group._id,
          deletedFor: { $ne: ourUserId },
        })
          .sort({ createdAt: -1 })
          .populate("sender", "firstName lastName username")
          .lean();

        const pref = await ConversationPreference.findOne({
          user: ourUserId,
          conversationWith: group._id,
        }).lean();

        return {
          ...group,
          lastMessage: latestMsg
            ? {
                _id: latestMsg._id,
                text: latestMsg.isUnsent ? "" : latestMsg.text,
                isUnsent: Boolean(latestMsg.isUnsent),
                sender: latestMsg.sender,
                createdAt: latestMsg.createdAt,
              }
            : null,
          isPinned: Boolean(pref?.isPinned),
          isMuted: Boolean(pref?.isMuted),
          isUnread: Boolean(pref?.isUnread),
          updatedAt: latestMsg?.createdAt || pref?.updatedAt || group.updatedAt,
        };
      })
    );

    // Sort pinned first, then by updatedAt descending
    enrichedGroups.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      const timeA = new Date(a.updatedAt || 0).getTime();
      const timeB = new Date(b.updatedAt || 0).getTime();
      return timeB - timeA;
    });

    return res.status(200).json(enrichedGroups);
  } catch (error) {
    console.error("Error in getGroups:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// GET /api/groups/:groupId - Get single group details
const getGroupById = async (req, res) => {
  try {
    let userData;
    try {
      userData = await protect(req);
    } catch {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { groupId } = req.params;
    const ourUserId = userData._id;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Invalid group ID" });
    }

    const group = await Group.findById(groupId)
      .populate("members admins createdBy", "firstName lastName username avatarLink bio")
      .lean();

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Verify current user is a member
    const isMember = group.members.some(
      (m) => m._id.toString() === ourUserId.toString()
    );
    if (!isMember) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    return res.status(200).json(group);
  } catch (error) {
    console.error("Error in getGroupById:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// GET /api/groups/:groupId/messages - Get group messages
const getGroupMessages = async (req, res) => {
  try {
    let userData;
    try {
      userData = await protect(req);
    } catch {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { groupId } = req.params;
    const ourUserId = userData._id;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Invalid group ID" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Verify membership
    const isMember = group.members.some(
      (m) => m.toString() === ourUserId.toString()
    );
    if (!isMember) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    const messages = await Message.find({
      group: groupId,
      deletedFor: { $ne: ourUserId },
    })
      .populate("sender", "firstName lastName username avatarLink")
      .populate({
        path: "replyTo",
        select: "sender recipient text isUnsent deletedFor createdAt",
        populate: {
          path: "sender",
          select: "firstName lastName username",
        },
      })
      .sort({ createdAt: 1 });

    const sanitizedMessages = messages.map((m) => {
      const doc = m.toObject();
      if (doc.isUnsent) {
        doc.text = "";
      }
      if (doc.replyTo) {
        if (doc.replyTo.isUnsent) {
          doc.replyTo.text = "";
        }
        if (
          Array.isArray(doc.replyTo.deletedFor) &&
          doc.replyTo.deletedFor.some(
            (id) => id.toString() === ourUserId.toString()
          )
        ) {
          doc.replyTo.text = "";
          doc.replyTo.isDeletedForMe = true;
        }
        delete doc.replyTo.deletedFor;
      }
      return doc;
    });

    return res.status(200).json(sanitizedMessages);
  } catch (error) {
    console.error("Error in getGroupMessages:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// POST /api/groups/:groupId/messages - Send message to group (REST)
const sendGroupMessageRest = async (req, res) => {
  try {
    let userData;
    try {
      userData = await protect(req);
    } catch {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { groupId } = req.params;
    const { text, replyTo } = req.body;
    const ourUserId = userData._id;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Invalid group ID" });
    }

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ message: "Message text is required" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Verify membership
    const isMember = group.members.some(
      (m) => m.toString() === ourUserId.toString()
    );
    if (!isMember) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    // Validate replyTo if provided
    let originalReplyDoc = null;
    if (replyTo !== undefined && replyTo !== null) {
      if (!mongoose.Types.ObjectId.isValid(replyTo)) {
        return res.status(400).json({ message: "Invalid replyTo message ID" });
      }
      originalReplyDoc = await Message.findById(replyTo).populate(
        "sender",
        "firstName lastName username"
      );
      if (!originalReplyDoc) {
        return res.status(400).json({ message: "Referenced reply message not found" });
      }
      if (
        !originalReplyDoc.group ||
        originalReplyDoc.group.toString() !== groupId.toString()
      ) {
        return res.status(400).json({
          message: "Cannot reply to a message from another group or conversation",
        });
      }
    }

    const msgDoc = await Message.create({
      sender: ourUserId,
      recipient: null,
      group: groupId,
      text: text.trim(),
      isUnsent: false,
      deletedFor: [],
      replyTo: replyTo || null,
    });

    await msgDoc.populate("sender", "firstName lastName username avatarLink");

    const responseObj = msgDoc.toObject();
    if (originalReplyDoc) {
      responseObj.replyTo = {
        _id: originalReplyDoc._id,
        id: originalReplyDoc._id,
        sender: originalReplyDoc.sender,
        text: originalReplyDoc.isUnsent ? "" : originalReplyDoc.text,
        isUnsent: Boolean(originalReplyDoc.isUnsent),
        createdAt: originalReplyDoc.createdAt,
      };
    }

    // Broadcast via WebSocket to connected group members
    if (typeof notifyGroupMessage === "function") {
      notifyGroupMessage(group.members.map((m) => m.toString()), responseObj);
    }

    return res.status(201).json(responseObj);
  } catch (error) {
    console.error("Error in sendGroupMessageRest:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// POST /api/groups/:groupId/members - Add members to group (Admin only)
const addMembers = async (req, res) => {
  try {
    let userData;
    try {
      userData = await protect(req);
    } catch {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { groupId } = req.params;
    const { members } = req.body;
    const ourUserId = userData._id;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Invalid group ID" });
    }

    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ message: "Members array is required" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Verify current user is admin
    const isAdmin = group.admins.some(
      (a) => a.toString() === ourUserId.toString()
    );
    if (!isAdmin) {
      return res
        .status(403)
        .json({ message: "Only group admins can add members" });
    }

    const newMemberIds = [];
    for (const memberId of members) {
      if (!mongoose.Types.ObjectId.isValid(memberId)) {
        return res
          .status(400)
          .json({ message: `Invalid member ID: ${memberId}` });
      }

      // Check if already in group
      if (group.members.some((m) => m.toString() === memberId.toString())) {
        continue;
      }

      const userDoc = await User.findById(memberId);
      if (!userDoc) {
        return res
          .status(404)
          .json({ message: `User not found: ${memberId}` });
      }

      // Check block
      const isBlocked = await Block.findOne({
        $or: [
          { blocker: ourUserId, blocked: memberId },
          { blocker: memberId, blocked: ourUserId },
        ],
      });
      if (isBlocked) {
        return res
          .status(403)
          .json({ message: "Cannot add blocked user to group" });
      }

      // Check friendship
      const canonicalPair = Friendship.getCanonicalPair(ourUserId, memberId);
      const friendship = await Friendship.findOne({
        canonicalPair,
        status: "ACCEPTED",
      });
      if (!friendship) {
        return res.status(403).json({
          message: "You can only add accepted friends to a group",
        });
      }

      newMemberIds.push(new mongoose.Types.ObjectId(memberId));
    }

    if (newMemberIds.length > 0) {
      group.members.push(...newMemberIds);
      await group.save();
    }

    await group.populate(
      "members admins createdBy",
      "firstName lastName username avatarLink bio"
    );

    // Notify all members including new members
    if (typeof notifyGroupEvent === "function") {
      notifyGroupEvent(group.members.map((m) => m._id.toString()), {
        type: "group_member_added",
        groupId: group._id,
        group,
        addedMembers: newMemberIds,
      });
    }

    return res.status(200).json(group);
  } catch (error) {
    console.error("Error in addMembers:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// DELETE /api/groups/:groupId/members/:userId - Remove member from group (Admin only)
const removeMember = async (req, res) => {
  try {
    let userData;
    try {
      userData = await protect(req);
    } catch {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { groupId, userId } = req.params;
    const ourUserId = userData._id;

    if (
      !mongoose.Types.ObjectId.isValid(groupId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return res.status(400).json({ message: "Invalid ID provided" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Verify current user is admin
    const isAdmin = group.admins.some(
      (a) => a.toString() === ourUserId.toString()
    );
    if (!isAdmin) {
      return res
        .status(403)
        .json({ message: "Only group admins can remove members" });
    }

    // Verify target is a member
    const targetIsMember = group.members.some(
      (m) => m.toString() === userId.toString()
    );
    if (!targetIsMember) {
      return res
        .status(404)
        .json({ message: "User is not a member of this group" });
    }

    // Cannot remove the only admin
    if (
      group.admins.length === 1 &&
      group.admins[0].toString() === userId.toString()
    ) {
      return res.status(400).json({
        message: "Cannot remove the only admin of the group",
      });
    }

    const allPreviousMembers = group.members.map((m) => m.toString());

    group.members = group.members.filter(
      (m) => m.toString() !== userId.toString()
    );
    group.admins = group.admins.filter(
      (a) => a.toString() !== userId.toString()
    );

    await group.save();
    await group.populate(
      "members admins createdBy",
      "firstName lastName username avatarLink bio"
    );

    // Notify all members (including removed user so their UI updates)
    if (typeof notifyGroupEvent === "function") {
      notifyGroupEvent(allPreviousMembers, {
        type: "group_member_removed",
        groupId: group._id,
        group,
        removedUserId: userId,
      });
    }

    return res.status(200).json({
      message: "Member removed successfully",
      group,
    });
  } catch (error) {
    console.error("Error in removeMember:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// POST /api/groups/:groupId/leave - Leave group (Any member)
const leaveGroup = async (req, res) => {
  try {
    let userData;
    try {
      userData = await protect(req);
    } catch {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { groupId } = req.params;
    const ourUserId = userData._id;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Invalid group ID" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Verify current user is a member
    const isMember = group.members.some(
      (m) => m.toString() === ourUserId.toString()
    );
    if (!isMember) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    const isCurrentAdmin = group.admins.some(
      (a) => a.toString() === ourUserId.toString()
    );

    // If current user is the only admin, auto-promote next member if other members exist
    if (isCurrentAdmin && group.admins.length === 1) {
      const remainingMember = group.members.find(
        (m) => m.toString() !== ourUserId.toString()
      );
      if (remainingMember) {
        group.admins.push(remainingMember);
      }
    }

    const allPreviousMembers = group.members.map((m) => m.toString());

    group.members = group.members.filter(
      (m) => m.toString() !== ourUserId.toString()
    );
    group.admins = group.admins.filter(
      (a) => a.toString() !== ourUserId.toString()
    );

    await group.save();

    // Broadcast leave event
    if (typeof notifyGroupEvent === "function") {
      notifyGroupEvent(allPreviousMembers, {
        type: "group_member_left",
        groupId: group._id,
        group,
        leftUserId: ourUserId,
      });
    }

    return res.status(200).json({
      message: "Left group successfully",
      groupId,
    });
  } catch (error) {
    console.error("Error in leaveGroup:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// PATCH /api/groups/:groupId - Update group name / avatar (Admin only)
const updateGroup = async (req, res) => {
  try {
    let userData;
    try {
      userData = await protect(req);
    } catch {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { groupId } = req.params;
    const { name, avatar } = req.body;
    const ourUserId = userData._id;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Invalid group ID" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Verify current user is admin
    const isAdmin = group.admins.some(
      (a) => a.toString() === ourUserId.toString()
    );
    if (!isAdmin) {
      return res
        .status(403)
        .json({ message: "Only group admins can update group details" });
    }

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ message: "Group name cannot be empty" });
      }
      const trimmed = name.trim();
      if (trimmed.length > 50) {
        return res
          .status(400)
          .json({ message: "Group name cannot exceed 50 characters" });
      }
      group.name = trimmed;
    }

    if (avatar !== undefined) {
      group.avatar = typeof avatar === "string" ? avatar.trim() : "";
    }

    await group.save();
    await group.populate(
      "members admins createdBy",
      "firstName lastName username avatarLink bio"
    );

    // Broadcast update event
    if (typeof notifyGroupEvent === "function") {
      notifyGroupEvent(group.members.map((m) => m._id.toString()), {
        type: "group_updated",
        groupId: group._id,
        group,
      });
    }

    return res.status(200).json(group);
  } catch (error) {
    console.error("Error in updateGroup:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = {
  createGroup,
  getGroups,
  getGroupById,
  getGroupMessages,
  sendGroupMessageRest,
  addMembers,
  removeMember,
  leaveGroup,
  updateGroup,
};
