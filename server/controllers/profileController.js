const jwt = require("jsonwebtoken");
const { User } = require("../models/userModel");
const protect = require("../middleware/protect");

const profileController = async (req, res) => {
  const token = protect.extractToken ? protect.extractToken(req) : (req.cookies?.authToken || null);
  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const userData = jwt.verify(token, process.env.JWTPRIVATEKEY);
    const user = await User.findOne({ _id: userData._id }).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json(user);
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const profileUpdate = async (req, res) => {
  const token = protect.extractToken ? protect.extractToken(req) : (req.cookies?.authToken || null);
  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const userData = jwt.verify(token, process.env.JWTPRIVATEKEY);
    const { firstName, lastName, username, bio, avatarLink } = req.body;

    const user = await User.findOne({ _id: userData._id });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (firstName && typeof firstName === "string" && firstName.trim()) {
      user.firstName = firstName.trim();
    }
    if (lastName && typeof lastName === "string" && lastName.trim()) {
      user.lastName = lastName.trim();
    }
    if (avatarLink && typeof avatarLink === "string" && avatarLink.trim()) {
      user.avatarLink = avatarLink.trim();
    }

    // Handle username update if provided
    if (username !== undefined && typeof username === "string") {
      const normalizedUsername = username.trim().toLowerCase().replace(/^@/, "");
      if (!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
        return res.status(400).json({
          message:
            "Username must be 3-20 characters and contain only letters, numbers, and underscores.",
        });
      }

      // Check if username is already taken by another user
      const existingUser = await User.findOne({
        username: normalizedUsername,
        _id: { $ne: userData._id },
      });
      if (existingUser) {
        return res
          .status(409)
          .json({ message: "Username is already taken." });
      }

      user.username = normalizedUsername;
    }

    // Handle bio update if provided
    if (bio !== undefined && typeof bio === "string") {
      const trimmedBio = bio.trim();
      if (trimmedBio.length > 160) {
        return res
          .status(400)
          .json({ message: "Bio cannot exceed 160 characters." });
      }
      user.bio = trimmedBio;
    }

    await user.save();

    const sanitizedUser = await User.findOne({ _id: userData._id }).select(
      "-password"
    );
    return res.status(200).json(sanitizedUser);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Username is already taken." });
    }
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const checkUsernameAvailability = async (req, res) => {
  try {
    const rawUsername = req.query.username;
    if (!rawUsername || typeof rawUsername !== "string") {
      return res.status(200).json({ available: false, message: "Username query required" });
    }

    const normalized = rawUsername.trim().toLowerCase().replace(/^@/, "");

    // Validate format
    if (!/^[a-z0-9_]{3,20}$/.test(normalized)) {
      return res.status(200).json({
        available: false,
        message: "Username must be 3-20 characters with letters, numbers, and underscores only.",
      });
    }

    // Optional: check if caller has auth token to exclude themselves
    let currentUserId = null;
    const token = protect.extractToken ? protect.extractToken(req) : (req.cookies?.authToken || null);
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWTPRIVATEKEY);
        currentUserId = decoded._id;
      } catch (e) {
        // Ignore token error for public check
      }
    }

    const query = { username: normalized };
    if (currentUserId) {
      query._id = { $ne: currentUserId };
    }

    const existingUser = await User.findOne(query);
    return res.status(200).json({ available: !existingUser });
  } catch (error) {
    console.error("Error in checkUsernameAvailability:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = { profileController, profileUpdate, checkUsernameAvailability };

