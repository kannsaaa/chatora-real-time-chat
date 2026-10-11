const mongoose = require("mongoose");
const protect = require("../middleware/protect");
const Friendship = require("../models/friendshipModel");
const Block = require("../models/blockModel");
const { User } = require("../models/userModel");
const {
  notifyFriendRequest,
  notifyFriendshipAccepted,
} = require("../wsServer");

// Helper to determine relationship state between two users
const determineRelationshipState = async (meId, otherId) => {
  if (!meId || !otherId) return "NOT_CONNECTED";
  const meStr = meId.toString();
  const otherStr = otherId.toString();
  if (meStr === otherStr) return "SELF";

  // Check blocks
  const [iBlocked, theyBlocked] = await Promise.all([
    Block.findOne({ blocker: meId, blocked: otherId }),
    Block.findOne({ blocker: otherId, blocked: meId }),
  ]);

  if (iBlocked) return "BLOCKED";
  if (theyBlocked) return "BLOCKED_BY_USER";

  // Check friendship
  const canonicalPair = Friendship.getCanonicalPair(meId, otherId);
  const friendship = await Friendship.findOne({ canonicalPair });

  if (!friendship) return "NOT_CONNECTED";

  if (friendship.status === "ACCEPTED") return "FRIENDS";

  if (friendship.status === "PENDING") {
    if (friendship.requester.toString() === meStr) {
      return "PENDING_SENT";
    }
    if (friendship.recipient.toString() === meStr) {
      return "PENDING_RECEIVED";
    }
  }

  return "NOT_CONNECTED";
};

// POST /api/friends/request/:userId
const sendFriendRequest = async (req, res) => {
  try {
    let userData;
    try {
      userData = await protect(req);
    } catch {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { userId } = req.params;
    const meId = userData._id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    if (meId.toString() === userId.toString()) {
      return res.status(400).json({ message: "Cannot send friend request to yourself" });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check blocks
    const [iBlocked, theyBlocked] = await Promise.all([
      Block.findOne({ blocker: meId, blocked: userId }),
      Block.findOne({ blocker: userId, blocked: meId }),
    ]);

    if (iBlocked) {
      return res.status(400).json({ message: "You have blocked this user. Unblock them first." });
    }
    if (theyBlocked) {
      return res.status(403).json({ message: "You cannot interact with this user" });
    }

    const canonicalPair = Friendship.getCanonicalPair(meId, userId);
    const existing = await Friendship.findOne({ canonicalPair });

    if (existing) {
      if (existing.status === "ACCEPTED") {
        return res.status(400).json({ message: "You are already friends with this user" });
      }

      if (existing.status === "PENDING") {
        if (existing.requester.toString() === meId.toString()) {
          return res.status(400).json({ message: "Friend request already sent" });
        }
        // Recipient is meId: other user already requested us! Automatically accept.
        existing.status = "ACCEPTED";
        await existing.save();

        if (typeof notifyFriendshipAccepted === "function") {
          notifyFriendshipAccepted(existing.requester, {
            _id: userData._id,
            firstName: userData.firstName,
            lastName: userData.lastName,
            username: userData.username,
            avatarLink: userData.avatarLink,
          });
        }

        return res.status(200).json({
          message: "Friend request accepted",
          status: "FRIENDS",
          friendship: existing,
        });
      }

      // If DECLINED, reset to PENDING
      existing.status = "PENDING";
      existing.requester = meId;
      existing.recipient = userId;
      await existing.save();

      if (typeof notifyFriendRequest === "function") {
        notifyFriendRequest(userId, {
          _id: userData._id,
          firstName: userData.firstName,
          lastName: userData.lastName,
          username: userData.username,
          avatarLink: userData.avatarLink,
        });
      }

      return res.status(200).json({
        message: "Friend request sent",
        status: "PENDING_SENT",
        friendship: existing,
      });
    }

    // Create new Friendship
    const newFriendship = await Friendship.create({
      requester: meId,
      recipient: userId,
      status: "PENDING",
      canonicalPair,
    });

    if (typeof notifyFriendRequest === "function") {
      notifyFriendRequest(userId, {
        _id: userData._id,
        firstName: userData.firstName,
        lastName: userData.lastName,
        username: userData.username,
        avatarLink: userData.avatarLink,
      });
    }

    return res.status(201).json({
      message: "Friend request sent successfully",
      status: "PENDING_SENT",
      friendship: newFriendship,
    });
  } catch (error) {
    console.error("Error in sendFriendRequest:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// POST /api/friends/request/:userId/accept
const acceptFriendRequest = async (req, res) => {
  try {
    let userData;
    try {
      userData = await protect(req);
    } catch {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { userId } = req.params;
    const meId = userData._id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Check blocks
    const [iBlocked, theyBlocked] = await Promise.all([
      Block.findOne({ blocker: meId, blocked: userId }),
      Block.findOne({ blocker: userId, blocked: meId }),
    ]);
    if (iBlocked || theyBlocked) {
      return res.status(403).json({ message: "Cannot accept request involving a blocked user" });
    }

    // Must be a pending request where requester = userId and recipient = meId
    const friendship = await Friendship.findOne({
      requester: userId,
      recipient: meId,
      status: "PENDING",
    });

    if (!friendship) {
      return res.status(404).json({ message: "No pending friend request found from this user" });
    }

    friendship.status = "ACCEPTED";
    await friendship.save();

    if (typeof notifyFriendshipAccepted === "function") {
      notifyFriendshipAccepted(userId, {
        _id: userData._id,
        firstName: userData.firstName,
        lastName: userData.lastName,
        username: userData.username,
        avatarLink: userData.avatarLink,
      });
    }

    return res.status(200).json({
      message: "Friend request accepted",
      status: "FRIENDS",
      friendship,
    });
  } catch (error) {
    console.error("Error in acceptFriendRequest:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// POST /api/friends/request/:userId/decline
const declineFriendRequest = async (req, res) => {
  try {
    let userData;
    try {
      userData = await protect(req);
    } catch {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { userId } = req.params;
    const meId = userData._id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const friendship = await Friendship.findOne({
      requester: userId,
      recipient: meId,
      status: "PENDING",
    });

    if (!friendship) {
      return res.status(404).json({ message: "No pending friend request found to decline" });
    }

    // Deleting the document frees up the canonicalPair cleanly
    await Friendship.deleteOne({ _id: friendship._id });

    return res.status(200).json({
      message: "Friend request declined",
      status: "NOT_CONNECTED",
    });
  } catch (error) {
    console.error("Error in declineFriendRequest:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// DELETE /api/friends/request/:userId (Cancel sent request)
const cancelFriendRequest = async (req, res) => {
  try {
    let userData;
    try {
      userData = await protect(req);
    } catch {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { userId } = req.params;
    const meId = userData._id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const friendship = await Friendship.findOne({
      requester: meId,
      recipient: userId,
      status: "PENDING",
    });

    if (!friendship) {
      return res.status(404).json({ message: "No pending friend request found to cancel" });
    }

    await Friendship.deleteOne({ _id: friendship._id });

    return res.status(200).json({
      message: "Friend request cancelled",
      status: "NOT_CONNECTED",
    });
  } catch (error) {
    console.error("Error in cancelFriendRequest:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// DELETE /api/friends/:userId (Unfriend)
const unfriendUser = async (req, res) => {
  try {
    let userData;
    try {
      userData = await protect(req);
    } catch {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { userId } = req.params;
    const meId = userData._id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const canonicalPair = Friendship.getCanonicalPair(meId, userId);
    const friendship = await Friendship.findOne({
      canonicalPair,
      status: "ACCEPTED",
    });

    if (!friendship) {
      return res.status(400).json({ message: "You are not friends with this user" });
    }

    // Delete friendship - does NOT delete messages
    await Friendship.deleteOne({ _id: friendship._id });

    return res.status(200).json({
      message: "Unfriended successfully",
      status: "NOT_CONNECTED",
    });
  } catch (error) {
    console.error("Error in unfriendUser:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// POST /api/friends/block/:userId (Block user)
const blockUser = async (req, res) => {
  try {
    let userData;
    try {
      userData = await protect(req);
    } catch {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { userId } = req.params;
    const meId = userData._id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    if (meId.toString() === userId.toString()) {
      return res.status(400).json({ message: "Cannot block yourself" });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // 1. Create or ensure block
    await Block.findOneAndUpdate(
      { blocker: meId, blocked: userId },
      { blocker: meId, blocked: userId },
      { upsert: true, new: true }
    );

    // 2. Remove any existing friendship or pending requests in either direction
    const canonicalPair = Friendship.getCanonicalPair(meId, userId);
    await Friendship.deleteMany({ canonicalPair });

    return res.status(200).json({
      message: "User blocked successfully",
      status: "BLOCKED",
    });
  } catch (error) {
    console.error("Error in blockUser:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// DELETE /api/friends/block/:userId (Unblock user)
const unblockUser = async (req, res) => {
  try {
    let userData;
    try {
      userData = await protect(req);
    } catch {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { userId } = req.params;
    const meId = userData._id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const existingBlock = await Block.findOne({
      blocker: meId,
      blocked: userId,
    });

    if (!existingBlock) {
      return res.status(404).json({ message: "User is not blocked" });
    }

    await Block.deleteOne({ _id: existingBlock._id });

    // Friendship does NOT automatically return
    return res.status(200).json({
      message: "User unblocked successfully",
      status: "NOT_CONNECTED",
    });
  } catch (error) {
    console.error("Error in unblockUser:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// GET /api/friends (List accepted friends)
const getFriends = async (req, res) => {
  try {
    let userData;
    try {
      userData = await protect(req);
    } catch {
      return res.status(401).json({ message: "Authentication required" });
    }

    const meId = userData._id;

    // Find all blocks involving me
    const blocks = await Block.find({
      $or: [{ blocker: meId }, { blocked: meId }],
    });
    const blockedUserIds = new Set(
      blocks.map((b) =>
        b.blocker.toString() === meId.toString()
          ? b.blocked.toString()
          : b.blocker.toString()
      )
    );

    const friendships = await Friendship.find({
      $or: [{ requester: meId }, { recipient: meId }],
      status: "ACCEPTED",
    })
      .populate("requester", "_id firstName lastName username bio avatarLink")
      .populate("recipient", "_id firstName lastName username bio avatarLink");

    const friendsList = [];
    for (const f of friendships) {
      const friendDoc =
        f.requester._id.toString() === meId.toString()
          ? f.recipient
          : f.requester;

      if (!friendDoc || !friendDoc._id) continue;
      if (blockedUserIds.has(friendDoc._id.toString())) continue;

      friendsList.push({
        _id: friendDoc._id,
        firstName: friendDoc.firstName,
        lastName: friendDoc.lastName,
        username: friendDoc.username,
        bio: friendDoc.bio,
        avatarLink: friendDoc.avatarLink,
        friendshipId: f._id,
        since: f.updatedAt,
      });
    }

    return res.status(200).json(friendsList);
  } catch (error) {
    console.error("Error in getFriends:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// GET /api/friends/requests (List received and sent pending requests)
const getFriendRequests = async (req, res) => {
  try {
    let userData;
    try {
      userData = await protect(req);
    } catch {
      return res.status(401).json({ message: "Authentication required" });
    }

    const meId = userData._id;

    // Find all blocks involving me
    const blocks = await Block.find({
      $or: [{ blocker: meId }, { blocked: meId }],
    });
    const blockedUserIds = new Set(
      blocks.map((b) =>
        b.blocker.toString() === meId.toString()
          ? b.blocked.toString()
          : b.blocker.toString()
      )
    );

    const [receivedDocs, sentDocs] = await Promise.all([
      Friendship.find({ recipient: meId, status: "PENDING" })
        .populate("requester", "_id firstName lastName username bio avatarLink")
        .sort({ createdAt: -1 }),
      Friendship.find({ requester: meId, status: "PENDING" })
        .populate("recipient", "_id firstName lastName username bio avatarLink")
        .sort({ createdAt: -1 }),
    ]);

    const received = receivedDocs
      .filter(
        (r) => r.requester && !blockedUserIds.has(r.requester._id.toString())
      )
      .map((r) => ({
        _id: r._id,
        createdAt: r.createdAt,
        user: r.requester,
      }));

    const sent = sentDocs
      .filter(
        (s) => s.recipient && !blockedUserIds.has(s.recipient._id.toString())
      )
      .map((s) => ({
        _id: s._id,
        createdAt: s.createdAt,
        user: s.recipient,
      }));

    return res.status(200).json({ received, sent });
  } catch (error) {
    console.error("Error in getFriendRequests:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// GET /api/friends/blocked (List blocked users)
const getBlockedUsers = async (req, res) => {
  try {
    let userData;
    try {
      userData = await protect(req);
    } catch {
      return res.status(401).json({ message: "Authentication required" });
    }

    const meId = userData._id;

    const blockedDocs = await Block.find({ blocker: meId })
      .populate("blocked", "_id firstName lastName username bio avatarLink")
      .sort({ createdAt: -1 });

    const list = blockedDocs
      .filter((b) => b.blocked)
      .map((b) => ({
        _id: b._id,
        user: b.blocked,
        createdAt: b.createdAt,
      }));

    return res.status(200).json(list);
  } catch (error) {
    console.error("Error in getBlockedUsers:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// GET /api/friends/status/:userId
const getRelationshipStatus = async (req, res) => {
  try {
    let userData;
    try {
      userData = await protect(req);
    } catch {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { userId } = req.params;
    const meId = userData._id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const status = await determineRelationshipState(meId, userId);
    return res.status(200).json({ status });
  } catch (error) {
    console.error("Error in getRelationshipStatus:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// GET /api/friends/all-statuses
const getAllRelationshipStatuses = async (req, res) => {
  try {
    let userData;
    try {
      userData = await protect(req);
    } catch {
      return res.status(401).json({ message: "Authentication required" });
    }

    const meId = userData._id;
    const meStr = meId.toString();

    const [blocks, friendships] = await Promise.all([
      Block.find({
        $or: [{ blocker: meId }, { blocked: meId }],
      }),
      Friendship.find({
        $or: [{ requester: meId }, { recipient: meId }],
      }),
    ]);

    const statuses = {};

    // 1. Process blocks
    for (const b of blocks) {
      if (b.blocker.toString() === meStr) {
        statuses[b.blocked.toString()] = "BLOCKED";
      } else {
        statuses[b.blocker.toString()] = "BLOCKED_BY_USER";
      }
    }

    // 2. Process friendships
    let pendingReceivedCount = 0;
    for (const f of friendships) {
      const otherId =
        f.requester.toString() === meStr
          ? f.recipient.toString()
          : f.requester.toString();

      // Block takes precedence
      if (statuses[otherId]) continue;

      if (f.status === "ACCEPTED") {
        statuses[otherId] = "FRIENDS";
      } else if (f.status === "PENDING") {
        if (f.requester.toString() === meStr) {
          statuses[otherId] = "PENDING_SENT";
        } else {
          statuses[otherId] = "PENDING_RECEIVED";
          pendingReceivedCount++;
        }
      }
    }

    return res.status(200).json({
      statuses,
      pendingReceivedCount,
    });
  } catch (error) {
    console.error("Error in getAllRelationshipStatuses:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = {
  determineRelationshipState,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  unfriendUser,
  blockUser,
  unblockUser,
  getFriends,
  getFriendRequests,
  getBlockedUsers,
  getRelationshipStatus,
  getAllRelationshipStatuses,
};
