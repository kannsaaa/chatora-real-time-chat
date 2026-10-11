//userRoute.js
const express = require('express');
const registerController = require('../controllers/registerController.js');
const loginController = require('../controllers/loginController.js');
const logoutController = require('../controllers/logoutController.js');
const verifyEmail = require('../controllers/emailVerifyController.js');
const profileController = require("../controllers/profileController.js");
const messageController = require("../controllers/messageController.js");
const peopleController = require("../controllers/peopleController.js");
const friendRoute = require("./friendRoute.js");

const router = express.Router();

router.post("/register", registerController);
router.post("/login", loginController);
router.post("/logout", logoutController);
router.get("/username/check", profileController.checkUsernameAvailability);
router.get("/:id/verify/:token", verifyEmail);
router.get("/profile", profileController.profileController);
router.get("/messages/:userId", messageController);
router.post("/messages/:userId", messageController.sendMessageRest);
router.delete("/messages/:messageId", messageController.deleteMessageForMe);
router.post("/messages/:messageId/unsend", messageController.unsendMessage);
const conversationRoute = require("./conversationRoute.js");
router.use("/conversations", conversationRoute);
router.get("/people", peopleController);
router.put("/profile/update", profileController.profileUpdate);

// Friend and Block APIs
router.use("/friends", friendRoute);

const chaosRoute = require("./chaosRoute.js");
router.use("/chaos", chaosRoute);

const groupRoute = require("./groupRoute.js");
router.use("/groups", groupRoute);

module.exports = router;
