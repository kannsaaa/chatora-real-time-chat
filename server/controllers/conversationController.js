const mongoose = require("mongoose");
const protect = require("../middleware/protect");
const Message = require("../models/messageModel");
const ConversationPreference = require("../models/conversationPreferenceModel");
const { User } = require("../models/userModel");

// GET /api/conversations - List conversations with preferences and previews
const getConversations = async (req, res) => {
  try {
    let userData;
    try {
      userData = await protect(req);
    } catch {
      return res.status(401).json({ message: "Authentication required" });
    }

    const ourUserId = userData._id;

    // 1. Find all distinct users that ourUserId has exchanged non-deleted messages with
    const activeMessages = await Message.find({
      $or: [{ sender: ourUserId }, { recipient: ourUserId }],
      deletedFor: { $ne: ourUserId },
    })
      .sort({ createdAt: -1 })
      .lean();

    const partnerIdMap = new Map(); // partnerId -> latestMessage
    for (const msg of activeMessages) {
      const partnerId =
        msg.sender.toString() === ourUserId.toString()
          ? msg.recipient.toString()
          : msg.sender.toString();

      if (!partnerIdMap.has(partnerId)) {
        partnerIdMap.set(partnerId, msg);
      }
    }

    // 2. Also find any conversations that have preferences (e.g. pinned)
    const preferences = await ConversationPreference.find({
      user: ourUserId,
    }).lean();

    const prefMap = new Map();
    for (const p of preferences) {
      const pId = p.conversationWith.toString();
      prefMap.set(pId, p);
      if (p.isPinned && !partnerIdMap.has(pId)) {
        partnerIdMap.set(pId, null);
      }
    }

    // 3. Fetch user details for all conversation partners
    const partnerIds = Array.from(partnerIdMap.keys()).filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );

    const users = await User.find({ _id: { $in: partnerIds } })
      .select("_id firstName lastName username avatarLink bio")
      .lean();

    const userMap = new Map();
    for (const u of users) {
      userMap.set(u._id.toString(), u);
    }

    // 4. Construct response
    const conversations = [];
    for (const partnerId of partnerIds) {
      const partnerUser = userMap.get(partnerId);
      if (!partnerUser) continue;

      const latestMsg = partnerIdMap.get(partnerId);
      const pref = prefMap.get(partnerId);

      conversations.push({
        _id: partnerUser._id,
        userId: partnerUser._id,
        firstName: partnerUser.firstName,
        lastName: partnerUser.lastName,
        username: partnerUser.username,
        avatarLink: partnerUser.avatarLink,
        bio: partnerUser.bio,
        lastMessage: latestMsg
          ? {
              text: latestMsg.isUnsent ? "" : latestMsg.text,
              isUnsent: Boolean(latestMsg.isUnsent),
              sender: latestMsg.sender,
              createdAt: latestMsg.createdAt,
            }
          : null,
        isPinned: Boolean(pref?.isPinned),
        isMuted: Boolean(pref?.isMuted),
        isUnread: Boolean(pref?.isUnread),
        updatedAt: latestMsg?.createdAt || pref?.updatedAt || partnerUser.updatedAt,
      });
    }

    // Sort: pinned first (by updatedAt desc), then remaining by updatedAt desc
    conversations.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      const timeA = new Date(a.updatedAt || 0).getTime();
      const timeB = new Date(b.updatedAt || 0).getTime();
      return timeB - timeA;
    });

    if (req.query.includeFriends === "true") {
      const Friendship = require("../models/friendshipModel");
      const Block = require("../models/blockModel");

      const blocks = await Block.find({
        $or: [{ blocker: ourUserId }, { blocked: ourUserId }],
      }).lean();
      const blockedUserIds = new Set(
        blocks.map((b) =>
          b.blocker.toString() === ourUserId.toString()
            ? b.blocked.toString()
            : b.blocker.toString()
        )
      );

      const friendships = await Friendship.find({
        $or: [{ requester: ourUserId }, { recipient: ourUserId }],
        status: "ACCEPTED",
      })
        .populate("requester", "_id firstName lastName username bio avatarLink")
        .populate("recipient", "_id firstName lastName username bio avatarLink")
        .lean();

      const existingIds = new Set(conversations.map((c) => c.userId.toString()));
      const friendEntries = [];

      for (const f of friendships) {
        const friendDoc =
          f.requester._id.toString() === ourUserId.toString()
            ? f.recipient
            : f.requester;

        if (!friendDoc || !friendDoc._id) continue;
        const fId = friendDoc._id.toString();
        if (blockedUserIds.has(fId)) continue;
        if (existingIds.has(fId)) continue; // Avoid duplicate

        friendEntries.push({
          _id: friendDoc._id,
          userId: friendDoc._id,
          firstName: friendDoc.firstName,
          lastName: friendDoc.lastName,
          username: friendDoc.username,
          avatarLink: friendDoc.avatarLink,
          bio: friendDoc.bio,
          lastMessage: null,
          isPinned: false,
          isMuted: false,
          isUnread: false,
          noMessagesYet: true,
          updatedAt: null,
        });
      }

      friendEntries.sort((a, b) => {
        const nameA = `${a.firstName} ${a.lastName}`.trim() || a.username || "";
        const nameB = `${b.firstName} ${b.lastName}`.trim() || b.username || "";
        return nameA.localeCompare(nameB);
      });

      conversations.push(...friendEntries);
    }

    return res.status(200).json(conversations);
  } catch (error) {
    console.error("Error in getConversations:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// PATCH /api/conversations/:userId/pin - Toggle or set pinned state
const togglePin = async (req, res) => {
  try {
    let userData;
    try {
      userData = await protect(req);
    } catch {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { userId } = req.params;
    const ourUserId = userData._id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    if (ourUserId.toString() === userId.toString()) {
      return res.status(400).json({ message: "Cannot pin conversation with yourself" });
    }

    let pref = await ConversationPreference.findOne({
      user: ourUserId,
      conversationWith: userId,
    });

    let newPinnedState;
    if (typeof req.body?.isPinned === "boolean") {
      newPinnedState = req.body.isPinned;
    } else {
      newPinnedState = pref ? !pref.isPinned : true;
    }

    pref = await ConversationPreference.findOneAndUpdate(
      { user: ourUserId, conversationWith: userId },
      { $set: { isPinned: newPinnedState } },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      message: newPinnedState ? "Conversation pinned" : "Conversation unpinned",
      userId,
      isPinned: pref.isPinned,
    });
  } catch (error) {
    console.error("Error in togglePin:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// PATCH /api/conversations/:userId/mute - Toggle or set muted state
const toggleMute = async (req, res) => {
  try {
    let userData;
    try {
      userData = await protect(req);
    } catch {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { userId } = req.params;
    const ourUserId = userData._id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    let pref = await ConversationPreference.findOne({
      user: ourUserId,
      conversationWith: userId,
    });

    let newMutedState;
    if (typeof req.body?.isMuted === "boolean") {
      newMutedState = req.body.isMuted;
    } else {
      newMutedState = pref ? !pref.isMuted : true;
    }

    pref = await ConversationPreference.findOneAndUpdate(
      { user: ourUserId, conversationWith: userId },
      { $set: { isMuted: newMutedState } },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      message: newMutedState ? "Notifications muted" : "Notifications unmuted",
      userId,
      isMuted: pref.isMuted,
    });
  } catch (error) {
    console.error("Error in toggleMute:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// PATCH /api/conversations/:userId/unread - Mark as read or unread
const setUnread = async (req, res) => {
  try {
    let userData;
    try {
      userData = await protect(req);
    } catch {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { userId } = req.params;
    const ourUserId = userData._id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const newUnreadState =
      typeof req.body?.isUnread === "boolean" ? req.body.isUnread : true;

    const pref = await ConversationPreference.findOneAndUpdate(
      { user: ourUserId, conversationWith: userId },
      { $set: { isUnread: newUnreadState } },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      message: newUnreadState ? "Marked as unread" : "Marked as read",
      userId,
      isUnread: pref.isUnread,
    });
  } catch (error) {
    console.error("Error in setUnread:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = {
  getConversations,
  togglePin,
  toggleMute,
  setUnread,
};
