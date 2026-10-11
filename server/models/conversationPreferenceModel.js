const mongoose = require("mongoose");

const conversationPreferenceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    conversationWith: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isMuted: {
      type: Boolean,
      default: false,
    },
    isUnread: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Compound unique index ensuring one preference document per user-conversation pair
conversationPreferenceSchema.index(
  { user: 1, conversationWith: 1 },
  { unique: true }
);

const ConversationPreference = mongoose.model(
  "ConversationPreference",
  conversationPreferenceSchema
);

module.exports = ConversationPreference;
