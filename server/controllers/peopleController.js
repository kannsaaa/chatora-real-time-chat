const jwt = require("jsonwebtoken");
const { User } = require("../models/userModel");

const peopleController = async (req, res) => {
  const token = req.cookies?.authToken;
  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  let currentUserId;
  try {
    const decoded = jwt.verify(token, process.env.JWTPRIVATEKEY);
    currentUserId = decoded._id;
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  try {
    const { q, page = 1, limit = 20 } = req.query;
    
    // Base query: verified users only, excluding the currently authenticated user (BUG-09)
    const query = {
      verified: true,
      _id: { $ne: currentUserId }
    };
    
    // Add search criteria if 'q' is provided, safely escaping regex metacharacters (BUG-08)
    if (q && typeof q === "string" && q.trim()) {
      const cleanQ = q.trim();
      const strippedQ = cleanQ.replace(/^@/, "");
      const sanitizedClean = cleanQ.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const sanitizedStripped = strippedQ.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const cleanRegex = new RegExp(sanitizedClean, "i");
      const strippedRegex = new RegExp(sanitizedStripped, "i");

      query.$or = [
        { firstName: cleanRegex },
        { lastName: cleanRegex },
        { username: strippedRegex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;
    
    // Select only safe fields to expose publicly (including username and bio)
    const users = await User.find(query)
      .select("_id firstName lastName username bio avatarLink")
      .skip(skip)
      .limit(limitNum)
      .lean();

    const userIds = users.map((u) => u._id);
    const Friendship = require("../models/friendshipModel");
    const Block = require("../models/blockModel");

    const [blocks, friendships] = await Promise.all([
      Block.find({
        $or: [
          { blocker: currentUserId, blocked: { $in: userIds } },
          { blocker: { $in: userIds }, blocked: currentUserId },
        ],
      }),
      Friendship.find({
        $or: [
          { requester: currentUserId, recipient: { $in: userIds } },
          { requester: { $in: userIds }, recipient: currentUserId },
        ],
      }),
    ]);

    const blockMap = {};
    for (const b of blocks) {
      if (b.blocker.toString() === currentUserId.toString()) {
        blockMap[b.blocked.toString()] = "BLOCKED";
      } else {
        blockMap[b.blocker.toString()] = "BLOCKED_BY_USER";
      }
    }

    const friendshipMap = {};
    for (const f of friendships) {
      const otherId =
        f.requester.toString() === currentUserId.toString()
          ? f.recipient.toString()
          : f.requester.toString();
      if (f.status === "ACCEPTED") {
        friendshipMap[otherId] = "FRIENDS";
      } else if (f.status === "PENDING") {
        if (f.requester.toString() === currentUserId.toString()) {
          friendshipMap[otherId] = "PENDING_SENT";
        } else {
          friendshipMap[otherId] = "PENDING_RECEIVED";
        }
      }
    }

    const usersWithStatus = users.map((u) => {
      const idStr = u._id.toString();
      const status =
        blockMap[idStr] || friendshipMap[idStr] || "NOT_CONNECTED";
      return {
        ...u,
        relationshipStatus: status,
      };
    });

    return res.status(200).json(usersWithStatus);
  } catch (error) {
    console.error("Error in peopleController:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = peopleController;
