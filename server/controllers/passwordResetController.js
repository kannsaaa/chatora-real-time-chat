// controllers/passwordResetController.js
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const Joi = require("joi");
const passwordComplexity = require("joi-password-complexity");
const { User } = require("../models/userModel.js");
const { PasswordResetToken } = require("../models/passwordResetTokenModel.js");
const sendEmail = require("../utils/sendEmail.js");

const getFrontendBase = () => {
  return (
    process.env.FRONTEND_URL ||
    process.env.CLIENT_URL ||
    process.env.BASE_URL ||
    process.env.APP_URL ||
    "http://localhost:5173"
  )
    .trim()
    .replace(/\/+users\/?$/, "")
    .replace(/\/+$/, "");
};

/**
 * Request password reset (Forgot Password)
 * Anti-enumeration: returns identical success message whether email exists or not.
 */
const requestPasswordReset = async (req, res) => {
  try {
    const schema = Joi.object({
      email: Joi.string().email().trim().lowercase().required().label("Email"),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const normalizedEmail = (req.body.email || "").trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    // Anti-enumeration protection:
    // If user does not exist or is not verified, do NOT disclose this.
    // Return standard success message without sending email.
    if (!user || !user.verified) {
      return res.status(200).json({
        message:
          "If an account with that email exists, password reset instructions have been sent.",
      });
    }

    // Clean up any existing reset tokens for this user
    await PasswordResetToken.deleteMany({ userId: user._id });

    // Generate secure 32-byte cryptographically random token
    const rawToken = crypto.randomBytes(32).toString("hex");

    await new PasswordResetToken({
      userId: user._id,
      token: rawToken,
      expiresAt: new Date(Date.now() + 3600000), // 1 hour expiration
    }).save();

    const frontendBase = getFrontendBase();
    const resetUrl = `${frontendBase}/reset-password/${user._id}/${rawToken}`;

    const plainText = `Hi ${user.firstName || "there"},\n\nWe received a request to reset your Chatora account password.\nPlease click the link below to choose a new password:\n${resetUrl}\n\nThis link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email — your password will remain unchanged.`;

    const html = sendEmail.getPasswordResetHtml
      ? sendEmail.getPasswordResetHtml(resetUrl, user.firstName)
      : undefined;

    try {
      await sendEmail(
        user.email,
        "Reset your Chatora password",
        plainText,
        html
      );
    } catch (emailErr) {
      // Clean up token if email delivery failed
      await PasswordResetToken.deleteMany({ userId: user._id });
      console.error(
        "[passwordResetController] Error delivering password reset email:",
        emailErr.message || emailErr
      );
      return res.status(500).json({
        message: "Unable to send password reset email. Please try again later.",
      });
    }

    return res.status(200).json({
      message:
        "If an account with that email exists, password reset instructions have been sent.",
    });
  } catch (err) {
    console.error("Error in requestPasswordReset:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * Verify validity of a password reset token
 */
const verifyResetToken = async (req, res) => {
  const { id, token } = req.params;
  const frontendBase = getFrontendBase();

  const acceptsHtml =
    req.headers.accept &&
    req.headers.accept.includes("text/html") &&
    !req.xhr &&
    !req.headers["x-requested-with"];

  try {
    if (!id || !token || !mongoose.Types.ObjectId.isValid(id)) {
      if (acceptsHtml) {
        return res.redirect(`${frontendBase}/forgot-password`);
      }
      return res
        .status(400)
        .json({ message: "Invalid or expired password reset link" });
    }

    const user = await User.findById(id);
    if (!user) {
      if (acceptsHtml) {
        return res.redirect(`${frontendBase}/forgot-password`);
      }
      return res
        .status(400)
        .json({ message: "Invalid or expired password reset link" });
    }

    const tokenDoc = await PasswordResetToken.findOne({
      userId: user._id,
      token,
    });

    if (!tokenDoc) {
      if (acceptsHtml) {
        return res.redirect(`${frontendBase}/forgot-password`);
      }
      return res
        .status(400)
        .json({ message: "Invalid or expired password reset link" });
    }

    if (tokenDoc.expiresAt < Date.now()) {
      await PasswordResetToken.deleteOne({ _id: tokenDoc._id });
      if (acceptsHtml) {
        return res.redirect(`${frontendBase}/forgot-password`);
      }
      return res
        .status(400)
        .json({ message: "Password reset link has expired" });
    }

    if (acceptsHtml) {
      return res.redirect(`${frontendBase}/reset-password/${id}/${token}`);
    }

    return res.status(200).json({ valid: true, message: "Token is valid" });
  } catch (err) {
    console.error("Error in verifyResetToken:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * Set new password
 */
const resetPassword = async (req, res) => {
  const id = req.params.id || req.body.id || req.body.userId;
  const token = req.params.token || req.body.token;
  const password = req.body.password;

  try {
    // 1. Validate password complexity
    const schema = Joi.object({
      password: passwordComplexity().required().label("Password"),
    });

    const { error } = schema.validate({ password });
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    // 2. Validate user ID format
    if (!id || !token || !mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ message: "Invalid or expired password reset link" });
    }

    // 3. Find user
    const user = await User.findById(id);
    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or expired password reset link" });
    }

    // 4. Find token
    const tokenDoc = await PasswordResetToken.findOne({
      userId: user._id,
      token,
    });

    if (!tokenDoc) {
      return res
        .status(400)
        .json({ message: "Invalid or expired password reset link" });
    }

    // 5. Check expiration
    if (tokenDoc.expiresAt < Date.now()) {
      await PasswordResetToken.deleteOne({ _id: tokenDoc._id });
      return res
        .status(400)
        .json({ message: "Password reset link has expired" });
    }

    // 6. Hash new password securely
    const salt = await bcrypt.genSalt(Number(process.env.SALT) || 10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();

    // 7. Invalidate/delete all reset tokens for this user
    await PasswordResetToken.deleteMany({ userId: user._id });

    return res.status(200).json({
      message:
        "Password reset successful! You can now log in with your new password.",
    });
  } catch (err) {
    console.error("Error in resetPassword:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = {
  requestPasswordReset,
  verifyResetToken,
  resetPassword,
};
