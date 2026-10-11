const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", default: null },
    text: { type: String, default: "" },
    isUnsent: { type: Boolean, default: false },
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
  },
  { timestamps: true }
);

MessageSchema.index({ group: 1, createdAt: 1 });

const Message = mongoose.model("Message", MessageSchema);

module.exports = Message;
