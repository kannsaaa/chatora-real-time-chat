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
    const ourObjectId = mongoose.Types.ObjectId.isValid(ourUserId)
      ? new mongoose.Types.ObjectId(ourUserId)
      : ourUserId;
    const ourIdStr = ourUserId.toString();

    // 1. Find all distinct users that ourUserId has exchanged non-deleted direct messages with.
    // Explicitly exclude group messages (which have recipient: null).
    const activeMessages = await Message.find({
      group: null,
      recipient: { $ne: null },
      $or: [
        { sender: ourObjectId },
        { recipient: ourObjectId },
        { sender: ourUserId },
        { recipient: ourUserId },
      ],
      deletedFor: { $nin: [ourObjectId, ourUserId] },
    })
      .sort({ createdAt: -1 })
      .lean();

    const partnerIdMap = new Map(); // partnerId (string) -> latestMessage
    for (const msg of activeMessages) {
      if (!msg.sender || !msg.recipient) continue;
      const senderStr = msg.sender.toString();
      const recipientStr = msg.recipient.toString();

      const partnerId = senderStr === ourIdStr ? recipientStr : senderStr;
      if (!partnerId || partnerId === ourIdStr) continue;

      if (!partnerIdMap.has(partnerId)) {
        partnerIdMap.set(partnerId, msg);
      }
    }

    // 2. Also find any conversations that have preferences (e.g. pinned)
    const preferences = await ConversationPreference.find({
      $or: [{ user: ourObjectId }, { user: ourUserId }],
    }).lean();

    const prefMap = new Map();
    for (const p of preferences) {
      if (!p.conversationWith) continue;
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
    const partnerObjectIds = partnerIds.map((id) => new mongoose.Types.ObjectId(id));

    const users = await User.find({
      $or: [
        { _id: { $in: partnerObjectIds } },
        { _id: { $in: partnerIds } },
      ],
    })
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
      const pIdStr = partnerUser._id.toString();

      conversations.push({
        _id: pIdStr,
        userId: pIdStr,
        firstName: partnerUser.firstName,
        lastName: partnerUser.lastName,
        username: partnerUser.username,
        avatarLink: partnerUser.avatarLink,
        bio: partnerUser.bio,
        lastMessage: latestMsg
          ? {
              text: latestMsg.isUnsent ? "" : latestMsg.text,
              isUnsent: Boolean(latestMsg.isUnsent),
              sender: latestMsg.sender.toString(),
              createdAt: latestMsg.createdAt,
            }
          : null,
        isPinned: Boolean(pref?.isPinned),
        isMuted: Boolean(pref?.isMuted),
        isUnread: Boolean(pref?.isUnread),
        noMessagesYet: !latestMsg,
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
        $or: [
          { blocker: ourObjectId },
          { blocked: ourObjectId },
          { blocker: ourUserId },
          { blocked: ourUserId },
        ],
      }).lean();
      const blockedUserIds = new Set(
        blocks.map((b) => {
          const bBlocker = b.blocker.toString();
          const bBlocked = b.blocked.toString();
          return bBlocker === ourIdStr ? bBlocked : bBlocker;
        })
      );

      const friendships = await Friendship.find({
        $or: [
          { requester: ourObjectId },
          { recipient: ourObjectId },
          { requester: ourUserId },
          { recipient: ourUserId },
        ],
        status: "ACCEPTED",
      })
        .populate("requester", "_id firstName lastName username bio avatarLink")
        .populate("recipient", "_id firstName lastName username bio avatarLink")
        .lean();

      const existingIds = new Set(conversations.map((c) => String(c.userId || c._id)));
      const friendEntries = [];

      for (const f of friendships) {
        if (!f.requester || !f.recipient) continue;
        const reqId = (f.requester._id || f.requester).toString();
        const recId = (f.recipient._id || f.recipient).toString();

        const friendDoc = reqId === ourIdStr ? f.recipient : f.requester;
        if (!friendDoc || !friendDoc._id) continue;
        const fId = friendDoc._id.toString();

        if (blockedUserIds.has(fId)) continue;
        if (existingIds.has(fId)) continue; // Existing conversation takes priority

        friendEntries.push({
          _id: fId,
          userId: fId,
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
