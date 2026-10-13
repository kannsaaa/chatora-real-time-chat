//registerController.js
const bcrypt = require("bcrypt");
const { User, validateRegister } = require("../models/userModel.js");
const { Token } = require("../models/tokenModel.js");
const sendEmail = require("../utils/sendEmail.js");
const crypto = require("crypto");

const registerController = async (req, res) => {
  try {
    const { error } = validateRegister(req.body);
    if (error) {
      return res.status(400).send({ message: error.details[0].message });
    }

    // Normalize inputs
    const normalizedEmail = (req.body.email || "").trim().toLowerCase();
    const normalizedUsername = (req.body.username || "")
      .trim()
      .toLowerCase()
      .replace(/^@/, "");
    const firstName = (req.body.firstName || "").trim();
    const lastName = (req.body.lastName || "").trim();
    const bio = (req.body.bio || "").trim();

    // Check if user with the given normalized email already exists
    let existingUserByEmail = await User.findOne({ email: normalizedEmail });
    if (existingUserByEmail && existingUserByEmail.verified) {
      return res
        .status(409)
        .send({ message: "User with given email already exists" });
    }

    if (existingUserByEmail && existingUserByEmail.verificationLinkSent) {
      return res
        .status(400)
        .send({
          message: "A verification link has been already sent to your email",
        });
    }

    // Check if user with the given normalized username already exists
    const existingUserByUsername = await User.findOne({
      username: normalizedUsername,
    });
    if (existingUserByUsername) {
      return res
        .status(409)
        .send({ message: "Username is already taken." });
    }

    const salt = await bcrypt.genSalt(Number(process.env.SALT) || 10);
    const hashPassword = await bcrypt.hash(req.body.password, salt);

    // Save the user with normalized email, username, and trimmed names
    const user = await new User({
      firstName,
      lastName,
      username: normalizedUsername,
      email: normalizedEmail,
      password: hashPassword,
      bio,
    }).save();

    // Generate a verification token and send an email
    const token = await new Token({
      userId: user._id,
      token: crypto.randomBytes(16).toString("hex"),
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600000,
    }).save();

    const url = `${process.env.BASE_URL}/users/${user._id}/verify/${token.token}`;

    try {
      await sendEmail(user.email, "Verify Email", url);
      user.verificationLinkSent = true;
      await user.save();
    } catch (emailError) {
      console.error(
        `[registerController] Failed to send verification email to ${user.email}:`,
        emailError.message || emailError
      );

      // Do not silently mark as verified if email delivery fails.
      // Clean up token and unverified user so they can retry registration.
      try {
        await Token.deleteOne({ _id: token._id });
        await User.deleteOne({ _id: user._id });
      } catch (cleanupErr) {
        console.error(
          "[registerController] Error cleaning up user record after email failure:",
          cleanupErr.message || cleanupErr
        );
      }

      return res
        .status(500)
        .send({ message: "Unable to send verification email. Please try again later." });
    }

    res
      .status(201)
      .send({ message: `Verification Email Sent to ${user.email}` });
  } catch (error) {
    if (error.code === 11000) {
      if (
        error.keyPattern?.username ||
        (error.message && error.message.includes("username"))
      ) {
        return res.status(409).send({ message: "Username is already taken." });
      }
      return res.status(409).send({ message: "User with given email already exists" });
    }
    console.error("Error in registerController:", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
};

module.exports = registerController;
