const mongoose = require("mongoose");

const friendshipSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "DECLINED"],
      default: "PENDING",
      required: true,
    },
    // Canonical pair string: sort(requesterId, recipientId).join("_")
    // Ensures mathematically that no two users can have more than one relationship document
    canonicalPair: {
      type: String,
      required: true,
      unique: true,
    },
  },
  { timestamps: true }
);

// Indexes
friendshipSchema.index({ requester: 1, status: 1 });
friendshipSchema.index({ recipient: 1, status: 1 });

// Static helper to generate canonical pair string
friendshipSchema.statics.getCanonicalPair = function (user1Id, user2Id) {
  const id1 = user1Id.toString();
  const id2 = user2Id.toString();
  return [id1, id2].sort().join("_");
};

const Friendship = mongoose.model("Friendship", friendshipSchema);

module.exports = Friendship;
