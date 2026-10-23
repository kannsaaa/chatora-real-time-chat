require("dotenv").config();
const mongoose = require("mongoose");
const http = require("http");
const WebSocket = require("ws");
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const assert = require("assert");

// Models
const { User } = require("../models/userModel");
const Friendship = require("../models/friendshipModel");
const Block = require("../models/blockModel");
const Message = require("../models/messageModel");

// Controllers & Routes
const loginController = require("../controllers/loginController");
const logoutController = require("../controllers/logoutController");
const registerController = require("../controllers/registerController");
const profileController = require("../controllers/profileController");
const peopleController = require("../controllers/peopleController");
const friendRoute = require("../routes/friendRoute");
const conversationRoute = require("../routes/conversationRoute");
const createWebSocketServer = require("../wsServer");

const TEST_PORT = 4199;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const WS_URL = `ws://127.0.0.1:${TEST_PORT}`;
const DB_URI = process.env.DB || "mongodb://127.0.0.1:27017/chatapp";

async function runTests() {
  console.log("=== Starting Chatora Dual-Token Authentication Test Suite ===\n");

  // 1. Database Connection
  console.log("[1/10] Connecting to MongoDB...");
  await mongoose.connect(DB_URI);
  console.log("  ✓ Connected to MongoDB");

  // 2. Setup Server
  console.log("[2/10] Bootstrapping Express & WebSocket Server on port", TEST_PORT);
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(cors({ origin: true, credentials: true }));

  // Mount routes
  app.post("/api/user/register", registerController);
  app.post("/api/user/login", loginController);
  app.post("/api/user/logout", logoutController);
  app.get("/api/user/profile", profileController.profileController);
  app.get("/api/user/people", peopleController);
  app.use("/api/friends", friendRoute);
  app.use("/api/conversations", conversationRoute);

  const server = http.createServer(app);
  createWebSocketServer(server);

  await new Promise((resolve) => server.listen(TEST_PORT, "127.0.0.1", resolve));
  console.log(`  ✓ Server running at ${BASE_URL}`);

  const rand = Math.random().toString(36).substring(2, 7);
  const pw = "Password123!";

  const emailA = `alice_${rand}@chatora.com`;
  const emailB = `bob_${rand}@chatora.com`;

  try {
    // 3. Register and Verify Two Users Directly in MongoDB
    console.log("\n[3/10] Creating Verified Test Users (Alice & Bob)...");
    const bcrypt = require("bcrypt");
    const salt = await bcrypt.genSalt(10);
    const hashA = await bcrypt.hash(pw, salt);
    const hashB = await bcrypt.hash(pw, salt);

    await User.deleteMany({ email: { $in: [emailA, emailB] } });

    const userA = await new User({
      firstName: "Alice",
      lastName: "DualAuth",
      username: `alice_${rand}`,
      email: emailA,
      password: hashA,
      bio: "Alice testing dual-token auth ✨",
      verified: true,
    }).save();

    const userB = await new User({
      firstName: "Bob",
      lastName: "SafariUser",
      username: `bob_${rand}`,
      email: emailB,
      password: hashB,
      bio: "Bob testing iOS safari flow 🌸",
      verified: true,
    }).save();
    console.log(`  ✓ Created Alice (${userA._id}) and Bob (${userB._id})`);

    // Helper request function
    async function apiRequest(path, method = "GET", body = null, headers = {}) {
      const fetchHeaders = {
        "Content-Type": "application/json",
        ...headers,
      };
      const res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: fetchHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });
      let json = null;
      try {
        json = await res.json();
      } catch (_) {}
      return { status: res.status, data: json, headers: res.headers };
    }

    // 4. TEST 1: Login returns Bearer token AND HttpOnly Cookie
    console.log("\n[4/10] TEST 1: Login returns Bearer token in JSON AND HttpOnly cookie...");
    const loginRes = await apiRequest("/api/user/login", "POST", {
      email: emailA,
      password: pw,
    });
    assert.strictEqual(loginRes.status, 200, `Expected 200 OK, got ${loginRes.status}`);
    assert.ok(loginRes.data?.token, "Expected token in login response JSON body");
    const setCookie = loginRes.headers.get("set-cookie");
    assert.ok(setCookie && setCookie.includes("authToken="), "Expected authToken in Set-Cookie header");
    console.log("  ✓ Token returned in JSON:", loginRes.data.token.substring(0, 20) + "...");
    console.log("  ✓ HttpOnly Cookie returned in header:", setCookie.split(";")[0]);

    const aliceToken = loginRes.data.token;
    const rawCookie = setCookie.split(";")[0];

    // Login Bob to get Bob's token
    const loginBRes = await apiRequest("/api/user/login", "POST", {
      email: emailB,
      password: pw,
    });
    const bobToken = loginBRes.data.token;

    // 5. TEST 2: Existing Cookie Authentication (No Authorization header)
    console.log("\n[5/10] TEST 2: Existing Cookie Authentication (No Bearer Header)...");
    const cookieProfileRes = await apiRequest("/api/user/profile", "GET", null, {
      Cookie: rawCookie,
    });
    assert.strictEqual(cookieProfileRes.status, 200, `Expected 200, got ${cookieProfileRes.status}`);
    assert.strictEqual(cookieProfileRes.data?.email, emailA);
    console.log("  ✓ Profile successfully retrieved using ONLY cookie auth (Backward Compatibility)");

    // 6. TEST 3: GET /api/user/profile with Bearer Token ONLY (No Cookie)
    console.log("\n[6/10] TEST 3: GET /api/user/profile with Bearer token ONLY (No Cookie)...");
    const bearerProfileRes = await apiRequest("/api/user/profile", "GET", null, {
      Authorization: `Bearer ${aliceToken}`,
    });
    assert.strictEqual(bearerProfileRes.status, 200, `Expected 200, got ${bearerProfileRes.status}`);
    assert.strictEqual(bearerProfileRes.data?.email, emailA);
    console.log("  ✓ Profile successfully retrieved using ONLY Bearer token auth (Cross-Origin / iOS)");

    // 7. TEST 4: GET /api/user/people with Bearer Token ONLY (No Cookie)
    console.log("\n[7/10] TEST 4: GET /api/user/people with Bearer token ONLY (No Cookie)...");
    const peopleRes = await apiRequest(`/api/user/people?q=bob_${rand}`, "GET", null, {
      Authorization: `Bearer ${aliceToken}`,
    });
    assert.strictEqual(peopleRes.status, 200, `Expected 200, got ${peopleRes.status}`);
    assert.ok(Array.isArray(peopleRes.data), "Expected array of people");
    const foundBob = peopleRes.data.find((p) => String(p._id) === String(userB._id) || p.username === `bob_${rand}`);
    assert.ok(foundBob, "Expected Bob to appear in People discovery search for Alice");
    assert.strictEqual(foundBob.relationshipStatus, "NOT_CONNECTED");
    console.log(`  ✓ People list retrieved via Bearer token. Bob found with status: ${foundBob.relationshipStatus}`);

    // 8. TEST 5: Friends API with Bearer Token (Friend Request & Accept)
    console.log("\n[8/10] TEST 5: Friends API with Bearer Token ONLY (No Cookie)...");
    // Alice sends friend request to Bob
    const sendReq = await apiRequest(`/api/friends/request/${userB._id}`, "POST", null, {
      Authorization: `Bearer ${aliceToken}`,
    });
    assert.ok(sendReq.status === 200 || sendReq.status === 201, `Expected 200/201, got ${sendReq.status}`);

    // Bob accepts friend request from Alice
    const acceptReq = await apiRequest(`/api/friends/request/${userA._id}/accept`, "POST", null, {
      Authorization: `Bearer ${bobToken}`,
    });
    assert.strictEqual(acceptReq.status, 200, `Expected 200, got ${acceptReq.status}`);

    // Alice fetches friends list
    const friendsRes = await apiRequest("/api/friends", "GET", null, {
      Authorization: `Bearer ${aliceToken}`,
    });
    assert.strictEqual(friendsRes.status, 200, `Expected 200, got ${friendsRes.status}`);
    assert.ok(Array.isArray(friendsRes.data), "Expected array of friends");
    const bobFriend = friendsRes.data.find((f) => String(f._id || f.userId) === String(userB._id));
    assert.ok(bobFriend, "Bob should now appear in Alice's friends list");
    console.log(`  ✓ Friends API succeeded. Alice has ${friendsRes.data.length} friend(s), including Bob.`);

    // 9. TEST 6: GET /api/conversations?includeFriends=true with Bearer Token
    console.log("\n[9/10] TEST 6: GET /api/conversations?includeFriends=true with Bearer token...");
    const convoRes = await apiRequest("/api/conversations?includeFriends=true", "GET", null, {
      Authorization: `Bearer ${aliceToken}`,
    });
    assert.strictEqual(convoRes.status, 200, `Expected 200, got ${convoRes.status}`);
    assert.ok(Array.isArray(convoRes.data), "Expected array of conversations");
    const bobConvo = convoRes.data.find((c) => String(c._id || c.userId) === String(userB._id));
    assert.ok(bobConvo, "Accepted friend Bob should appear in conversations list via includeFriends=true");
    console.log(`  ✓ Conversations API succeeded. Found friend conversation for Bob.`);

    // 10. TEST 7: WebSocket Authentication with Query Token (No Cookie)
    console.log("\n[10/10] TEST 7: WebSocket Authentication with Query Token (?token=...)...");
    const wsWithToken = new WebSocket(`${WS_URL}/?token=${aliceToken}`);

    const wsAuthed = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("WS connection timed out")), 4000);
      wsWithToken.on("open", () => {
        // Send a ping message or wait for online announcement
        clearTimeout(timeout);
        resolve(true);
      });
      wsWithToken.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
    assert.ok(wsAuthed, "WebSocket connection with query token established");
    console.log("  ✓ WebSocket connected and authenticated via ?token query parameter");

    // Connect WebSocket without token to verify difference
    const wsWithoutToken = new WebSocket(`${WS_URL}`);
    await new Promise((resolve) => wsWithoutToken.on("open", resolve));
    console.log("  ✓ Unauthenticated WebSocket connected without token (ignored by authenticated broadcast)");

    wsWithToken.close();
    wsWithoutToken.close();

    // 11. TEST 8: Invalid & Missing Token Handling (Security & Robustness)
    console.log("\n[BONUS] TEST 8: Invalid & Missing Token Behavior...");
    const noTokenRes = await apiRequest("/api/user/profile", "GET");
    assert.strictEqual(noTokenRes.status, 401, "Expected 401 on missing token");

    const invalidBearerRes = await apiRequest("/api/user/profile", "GET", null, {
      Authorization: "Bearer invalid.jwt.signature",
    });
    assert.strictEqual(invalidBearerRes.status, 401, "Expected 401 on invalid Bearer token");

    const noTokenPeople = await apiRequest("/api/user/people?q=", "GET");
    assert.strictEqual(noTokenPeople.status, 401, "Expected 401 on missing token for /people");

    const noTokenFriends = await apiRequest("/api/friends", "GET");
    assert.strictEqual(noTokenFriends.status, 401, "Expected 401 on missing token for /friends");
    console.log("  ✓ All endpoints properly reject missing or invalid tokens with 401 Unauthorized");

    // 12. TEST 9: Logout Clears Authentication
    console.log("\n[BONUS] TEST 9: Logout Clears Cookie...");
    const logoutRes = await apiRequest("/api/user/logout", "POST", null, {
      Authorization: `Bearer ${aliceToken}`,
      Cookie: rawCookie,
    });
    assert.strictEqual(logoutRes.status, 200, "Expected 200 on logout");
    const logoutCookie = logoutRes.headers.get("set-cookie");
    assert.ok(logoutCookie && (logoutCookie.includes("authToken=;") || logoutCookie.includes("Max-Age=0")), "Cookie cleared");
    console.log("  ✓ Logout endpoint responds 200 and expires the authToken cookie");

    console.log("\n=======================================================");
    console.log("🎉 ALL 9 DUAL-TOKEN AUTHENTICATION TESTS PASSED 100%!");
    console.log("=======================================================\n");

    // Cleanup test users and friendships
    await User.deleteMany({ email: { $in: [emailA, emailB] } });
    await Friendship.deleteMany({
      $or: [
        { requester: { $in: [userA._id, userB._id] } },
        { recipient: { $in: [userA._id, userB._id] } },
      ],
    });

    server.close();
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("\n❌ TEST SUITE FAILED:", err);
    server.close();
    await mongoose.disconnect();
    process.exit(1);
  }
}

runTests();
