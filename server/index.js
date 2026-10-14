require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const connection = require("./db/db.js");
const userRoute = require("./routes/userRoute.js");
const avatarRoute = require("./routes/avatarRoute.js");
const cookieParser = require("cookie-parser");
const createWebSocketServer = require("./wsServer.js");
const path = require("path");
const fs = require("fs");
const verifyEmail = require("./controllers/emailVerifyController.js");

// Database connection
connection();

// Middlewares
app.use(express.json());
app.use(cookieParser());

const rawOrigins = [
  "http://localhost:5173",
  "http://localhost:4000",
  "https://swifty-chatty-appy.onrender.com",
  "https://chatora-u7yz.onrender.com",
  "https://chatora-real-time-chat.onrender.com",
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
  process.env.BASE_URL,
];

const allowedOrigins = rawOrigins
  .filter(Boolean)
  .map((origin) => origin.trim().replace(/\/+$/, ""));

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const normalizedOrigin = origin.trim().replace(/\/+$/, "");
    if (allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
    } else {
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  optionsSuccessStatus: 204,
  credentials: true, // Allow credentials like cookies
};

app.use(cors(corsOptions));

// Health check endpoints for deployment monitoring and testing
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "chatora-backend",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "chatora-backend",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Direct verification endpoints (handles clicks pointing to backend or frontend route paths)
app.get("/users/:id/verify/:token", verifyEmail);
app.get("/api/users/:id/verify/:token", verifyEmail);

app.use("/api/user", userRoute);
app.use("/api/avatar", avatarRoute);

// Friend and Block APIs alias
const friendRoute = require("./routes/friendRoute.js");
app.use("/api/friends", friendRoute);

// Convenient alias routes conforming to REST conventions
const messageController = require("./controllers/messageController.js");
const messageRouter = express.Router();
messageRouter.get("/:userId", messageController);
messageRouter.post("/:userId", messageController.sendMessageRest);
messageRouter.delete("/:messageId", messageController.deleteMessageForMe);
messageRouter.post("/:messageId/unsend", messageController.unsendMessage);
app.use("/api/messages", messageRouter);

const conversationRoute = require("./routes/conversationRoute.js");
app.use("/api/conversations", conversationRoute);

const chaosRoute = require("./routes/chaosRoute.js");
app.use("/api/chaos", chaosRoute);

const groupRoute = require("./routes/groupRoute.js");
app.use("/api/groups", groupRoute);

// Serve frontend build if present (e.g. unified deployment on Render)
const clientDist = path.join(__dirname, "..", "client", "dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) {
      return next();
    }
    res.sendFile(path.join(clientDist, "index.html"), (err) => {
      if (err) next(err);
    });
  });
}

// Bind to process.env.PORT and 0.0.0.0 for Render compatibility
const port = process.env.PORT || 4000;
const server = app.listen(port, "0.0.0.0", () =>
  console.log(`Application Running on Port ${port} listening on 0.0.0.0`)
);

createWebSocketServer(server);

module.exports = { app, server };
