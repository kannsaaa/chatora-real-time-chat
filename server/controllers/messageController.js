const mongoose = require("mongoose");
const protect = require("../middleware/protect");
const Message = require("../models/messageModel");
const { User } = require("../models/userModel");
const { notifyMessageUnsent } = require("../wsServer");

const messageController = async (req, res) => {
  try {
    let userData;
    try {
      userData = await protect(req);
    } catch (authError) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { userId } = req.params;
    const ourUserId = userData._id;

    // Validate MongoDB ObjectIds to prevent CastError crashes
    if (
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(ourUserId)
    ) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Exclude messages where current user is in deletedFor
    const messages = await Message.find({
      sender: { $in: [userId, ourUserId] },
      recipient: { $in: [userId, ourUserId] },
      deletedFor: { $ne: ourUserId },
    })
      .populate({
        path: "replyTo",
        select: "sender recipient text isUnsent deletedFor createdAt",
        populate: {
          path: "sender",
          select: "firstName lastName username",
        },
      })
      .sort({ createdAt: 1 });

    // Sanitize any unsent message text and replyTo text
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
    console.error("Error in messageController:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const deleteMessageForMe = async (req, res) => {
  try {
    let userData;
    try {
      userData = await protect(req);
    } catch (authError) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { messageId } = req.params;
    const ourUserId = userData._id;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: "Invalid message ID" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Verify ownership / participation
    let isAuthorized = false;
    if (message.sender.toString() === ourUserId.toString()) {
      isAuthorized = true;
    } else if (
      message.recipient &&
      message.recipient.toString() === ourUserId.toString()
    ) {
      isAuthorized = true;
    } else if (message.group) {
      const Group = require("../models/groupModel");
      const grp = await Group.findById(message.group);
      if (
        grp &&
        grp.members.some((m) => m.toString() === ourUserId.toString())
      ) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this message" });
    }

    await Message.findByIdAndUpdate(messageId, {
      $addToSet: { deletedFor: ourUserId },
    });

    return res.status(200).json({
      message: "Message deleted for you",
      messageId,
    });
  } catch (error) {
    console.error("Error in deleteMessageForMe:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const unsendMessage = async (req, res) => {
  try {
    let userData;
    try {
      userData = await protect(req);
    } catch (authError) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { messageId } = req.params;
    const ourUserId = userData._id;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: "Invalid message ID" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Only original sender can unsend!
    if (message.sender.toString() !== ourUserId.toString()) {
      return res
        .status(403)
        .json({ message: "Only the sender can unsend this message" });
    }

    if (message.isUnsent) {
      return res.status(200).json({
        message: "Message already unsent",
        messageId: message._id,
      });
    }

    message.isUnsent = true;
    message.text = "";
    await message.save();

    // Broadcast real-time WebSocket event
    if (typeof notifyMessageUnsent === "function") {
      notifyMessageUnsent(message);
    }

    return res.status(200).json({
      message: "Message unsent successfully",
      messageId: message._id,
    });
  } catch (error) {
    console.error("Error in unsendMessage:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const deleteConversation = async (req, res) => {
  try {
    let userData;
    try {
      userData = await protect(req);
    } catch (authError) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { userId } = req.params;
    const ourUserId = userData._id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Check if target is a group
    const Group = require("../models/groupModel");
    const isGroup = await Group.exists({ _id: userId });
    if (isGroup) {
      await Message.updateMany(
        { group: userId },
        {
          $addToSet: { deletedFor: ourUserId },
        }
      );
      const ConversationPreference = require("../models/conversationPreferenceModel");
      await ConversationPreference.deleteOne({
        user: ourUserId,
        conversationWith: userId,
      });
      return res.status(200).json({
        message: "Group conversation deleted for you",
        conversationId: userId,
      });
    }

    // Bulk update all messages between ourUserId and userId
    const result = await Message.updateMany(
      {
        sender: { $in: [userId, ourUserId] },
        recipient: { $in: [userId, ourUserId] },
      },
      {
        $addToSet: { deletedFor: ourUserId },
      }
    );

    // Also remove any conversation preferences for ourUserId
    const ConversationPreference = require("../models/conversationPreferenceModel");
    await ConversationPreference.deleteOne({
      user: ourUserId,
      conversationWith: userId,
    });

    return res.status(200).json({
      message: "Conversation deleted for you",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error in deleteConversation:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const sendMessageRest = async (req, res) => {
  try {
    let userData;
    try {
      userData = await protect(req);
    } catch {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { userId } = req.params;
    const { text, replyTo } = req.body;
    const ourUserId = userData._id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    if (ourUserId.toString() === userId.toString()) {
      return res.status(400).json({ message: "Cannot send message to yourself" });
    }

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ message: "Message text is required" });
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
      const origSenderId = (
        originalReplyDoc.sender?._id || originalReplyDoc.sender
      ).toString();
      const origRecipientId = (
        originalReplyDoc.recipient?._id || originalReplyDoc.recipient
      ).toString();
      const isSameConv =
        (origSenderId === ourUserId.toString() &&
          origRecipientId === userId.toString()) ||
        (origSenderId === userId.toString() &&
          origRecipientId === ourUserId.toString());
      if (!isSameConv) {
        return res.status(400).json({
          message: "Cannot reply to a message from another conversation",
        });
      }
    }

    // 1. Check Block relationship
    const Block = require("../models/blockModel");
    const isBlocked = await Block.findOne({
      $or: [
        { blocker: ourUserId, blocked: userId },
        { blocker: userId, blocked: ourUserId },
      ],
    });

    if (isBlocked) {
      return res.status(403).json({ message: "Cannot message blocked user" });
    }

    // 2. Check Friendship status === ACCEPTED
    const Friendship = require("../models/friendshipModel");
    const canonicalPair = Friendship.getCanonicalPair(ourUserId, userId);
    const friendship = await Friendship.findOne({
      canonicalPair,
      status: "ACCEPTED",
    });

    if (!friendship) {
      return res.status(403).json({ message: "You can only message friends." });
    }

    const msgDoc = await Message.create({
      sender: ourUserId,
      recipient: userId,
      text: text.trim(),
      isUnsent: false,
      deletedFor: [],
      replyTo: replyTo || null,
    });

    const responseObj = msgDoc.toObject();
    if (originalReplyDoc) {
      responseObj.replyTo = {
        _id: originalReplyDoc._id,
        id: originalReplyDoc._id,
        sender: originalReplyDoc.sender,
        recipient: originalReplyDoc.recipient,
        text: originalReplyDoc.isUnsent ? "" : originalReplyDoc.text,
        isUnsent: Boolean(originalReplyDoc.isUnsent),
        createdAt: originalReplyDoc.createdAt,
      };
    }

    return res.status(201).json(responseObj);
  } catch (error) {
    console.error("Error in sendMessageRest:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

messageController.messageController = messageController;
messageController.getMessages = messageController;
messageController.sendMessageRest = sendMessageRest;
messageController.deleteMessageForMe = deleteMessageForMe;
messageController.unsendMessage = unsendMessage;
messageController.deleteConversation = deleteConversation;

module.exports = messageController;
