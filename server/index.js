require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const connection = require("./db/db.js");
const userRoute = require("./routes/userRoute.js");
const avatarRoute = require("./routes/avatarRoute.js");
const cookieParser = require('cookie-parser')
const createWebSocketServer = require("./wsServer.js");
const path = require("path");

//database connection
connection();

//middlewares
app.use(express.json());
app.use(cookieParser())

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4000",
  "https://swifty-chatty-appy.onrender.com",
  "https://chatora-u7yz.onrender.com",
  process.env.FRONTEND_URL,
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  optionsSuccessStatus: 204,
  credentials: true, // Allow credentials like cookies
};

app.use(cors(corsOptions));

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

const port = process.env.PORT || 4000;
const server = app.listen(port, () => console.log(`Application Running on Port ${port}`));

createWebSocketServer(server); 

// Serve frontend if in production (optional, typically handled by Vite/Nginx in actual prod)
// app.use(express.static(path.join(__dirname, "..", "client", "dist")));
// app.get('/*', (req, res) => {
//   res.sendFile(path.join(__dirname, '../client/dist/index.html'), function (err) {
//     if (err) {
//       console.error('Error sending file:', err);
//     }
//   });
// });
