const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const passwordResetTokenSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: "user",
    index: true,
  },
  token: {
    type: String,
    required: true,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 },
  },
});

const PasswordResetToken =
  mongoose.models.password_reset_token ||
  mongoose.model("password_reset_token", passwordResetTokenSchema);

module.exports = { PasswordResetToken };
