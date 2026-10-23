//avatarController.js
const jwt = require("jsonwebtoken");
const Avatar = require("../models/avatars");
const protect = require("../middleware/protect");

async function avatarController(req, res) {
  // Check authentication
  const token = protect.extractToken ? protect.extractToken(req) : (req.cookies?.authToken || null);
  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    jwt.verify(token, process.env.JWTPRIVATEKEY);
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  // Check request body
  if (!req.body || typeof req.body !== "object") {
    return res.status(400).json({ error: "Malformed request body" });
  }

  const { link } = req.body;

  // Check if the link is provided and valid string
  if (!link || typeof link !== "string" || !link.trim()) {
    return res.status(400).json({ error: "Link is required" });
  }

  const trimmedLink = link.trim();

  // Validate avatar URL format and protocol (http/https only)
  try {
    const parsed = new URL(trimmedLink);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return res.status(400).json({ error: "Invalid URL protocol. Only HTTP and HTTPS are permitted." });
    }
  } catch (urlError) {
    return res.status(400).json({ error: "Invalid URL format" });
  }

  try {
    // Create a new avatar entry in the database
    const newAvatar = new Avatar({ link: trimmedLink });
    await newAvatar.save();

    // Return success response
    return res
      .status(201)
      .json({ success: true, message: "Avatar link added successfully" });
  } catch (error) {
    console.error("Error adding avatar link:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function getAllAvatars(req, res) {
  try {
    // Fetch all avatars from the database
    let avatars = await Avatar.find();

    // Seed default avatars if empty
    if (avatars.length === 0) {
      const defaultLinks = [
        "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=Milo",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=Sara",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=Leo",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=Zoey",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=Jack",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=Lily"
      ];
      await Avatar.insertMany(defaultLinks.map(link => ({ link })));
      avatars = await Avatar.find();
    }

    // Return the list of avatars
    return res.status(200).json({ success: true, avatars });
  } catch (error) {
    // Handle any errors that occur during the process
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

module.exports = { avatarController, getAllAvatars };
